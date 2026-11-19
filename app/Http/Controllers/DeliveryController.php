<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Models\ActivityLog;
use App\Models\Delivery;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class DeliveryController extends Controller
{
    private function rules(): array
    {
        return [
            'note'                        => 'nullable|string|max:255',
            'request_token'               => 'nullable|string|max:64',
            'items'                       => 'required|array|min:1',
            'items.*.transaction_item_id' => 'required|integer',
            'items.*.quantity'            => 'required|integer|min:0',
        ];
    }

    private function drRules(): array
    {
        return [
            'dr_number' => 'required|string|max:60',
            'dr_file'   => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ];
    }

    private function drMessages(): array
    {
        return [
            'dr_number.required' => 'The DR number is required.',
            'dr_file.required'   => 'The DR softcopy is required.',
            'dr_file.mimes'      => 'The DR softcopy must be a PDF or an image (JPG, PNG, WEBP).',
            'dr_file.max'        => 'The DR softcopy may not be larger than 10 MB.',
        ];
    }

    private function returnRules(): array
    {
        return $this->rules() + [
            'items.*.written_off' => 'nullable|integer|min:0',
            'items.*.reason'      => 'nullable|string|in:' . implode(',', array_keys(Delivery::RETURN_REASONS)),
            'items.*.replace'     => 'nullable|boolean',
        ];
    }

    /** [ordered, delivered] across all lines. */
    private function totals(Transaction $transaction): array
    {
        $lines = $transaction->items()
            ->withSum('deliveryItems as delivered_quantity', 'quantity')
            ->get();

        return [
            (int) $lines->sum('quantity'),
            (int) $lines->sum(fn ($l) => (int) $l->delivered_quantity),
        ];
    }

    /** Record a (full or partial) delivery. The card never moves because of this. */
    public function store(Request $request, Transaction $transaction)
    {
        if (Gate::denies('recordDelivery', $transaction)) {
            return back()->withErrors([
                'items' => "You don't have permission to record deliveries in this stage.",
            ]);
        }

        $validated = $request->validate($this->rules() + $this->drRules(), $this->drMessages());

        if (collect($validated['items'])->sum(fn ($i) => (int) $i['quantity']) <= 0) {
            return back()->withErrors(['items' => 'Enter a quantity to deliver for at least one item.']);
        }

        $file = $request->file('dr_file');
        $path = $file->store("delivery-receipts/{$transaction->id}", 'local');

        try {
            $delivery = $transaction->recordDelivery(
                $validated['items'],
                auth()->id(),
                $validated['note'] ?? null,
                $validated['request_token'] ?? null,
                [
                    'dr_number'    => trim($validated['dr_number']),
                    'dr_file_path' => $path,
                    'dr_file_name' => $file->getClientOriginalName(),
                ],
            );
        } catch (InsufficientStockException $e) {
            $this->discardFile($path);

            return back()->withErrors(['items' => 'Delivery not recorded. ' . $e->getMessage()]);
        } catch (\RuntimeException $e) {
            $this->discardFile($path);

            return back()->withErrors(['items' => $e->getMessage()]);
        } catch (\Throwable $e) {
            $this->discardFile($path);

            throw $e;
        }

        if (! $delivery->wasRecentlyCreated) {
            // Double click / retry: the first delivery was returned, so nothing new to log.
            $this->discardFile($path);
        } else {
            ActivityLog::record(
                'delivery.recorded',
                "Recorded delivery for “{$transaction->name}” (DR {$delivery->dr_number})",
                $transaction,
                [
                    'delivery_id' => $delivery->id,
                    'dr_number'   => $delivery->dr_number,
                    'units'       => (int) $delivery->items()->sum('quantity'),
                    'note'        => $delivery->note,
                ],
                $transaction->name,
            );
        }

        [$ordered, $delivered] = $this->totals($transaction);

        return back()->with('stock', $delivered >= $ordered
            ? "\"{$transaction->name}\" fully delivered ({$delivered}/{$ordered}). You can move it forward now."
            : "Partial delivery saved: {$delivered} of {$ordered} delivered. Deliver the rest whenever it's ready.");
    }

    /** Return delivered items: restock the good ones, write off the rest, replace or reduce the order. */
    public function returnItems(Request $request, Transaction $transaction)
    {
        if (Gate::denies('recordReturn', $transaction)) {
            return back()->withErrors([
                'items' => "You don't have permission to record returns.",
            ]);
        }

        $validated = $request->validate($this->returnRules());

        if (collect($validated['items'])->sum(fn ($i) => (int) $i['quantity']) <= 0) {
            return back()->withErrors(['items' => 'Enter a quantity to return for at least one item.']);
        }

        try {
            $delivery = $transaction->recordReturn(
                $validated['items'],
                auth()->id(),
                $validated['note'] ?? null,
                $validated['request_token'] ?? null,
            );
        } catch (InsufficientStockException $e) {
            return back()->withErrors(['items' => $e->getMessage()]);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['items' => $e->getMessage()]);
        }

        $target = $transaction->isFullyDelivered()
            ? null
            : $transaction->returnToDeliveryStage(auth()->id(), 'Items returned: sent back to delivery');

        $items      = $delivery->items()->get();
        $returned   = (int) abs($items->sum('quantity'));
        $writtenOff = (int) $items->sum('written_off_quantity');
        $restocked  = $returned - $writtenOff;
        $cancelled  = (int) abs($items->where('needs_replacement', false)->sum('quantity'));

        if ($delivery->wasRecentlyCreated) {
            ActivityLog::record(
                'delivery.returned',
                "Recorded return for “{$transaction->name}”: {$restocked} restocked, {$writtenOff} written off",
                $transaction,
                [
                    'delivery_id'  => $delivery->id,
                    'returned'     => $returned,
                    'restocked'    => $restocked,
                    'written_off'  => $writtenOff,
                    'cancelled'    => $cancelled,
                    'moved_back_to' => $target?->stage_name,
                    'note'         => $delivery->note,
                ],
                $transaction->name,
            );
        }

        [$ordered, $delivered] = $this->totals($transaction);

        $message = "Return saved: {$restocked} back in stock";
        $message .= $writtenOff > 0 ? ", {$writtenOff} written off (not restocked)." : '.';
        $message .= $cancelled > 0 ? " Order reduced by {$cancelled} (no replacement)." : '';
        $message .= " {$delivered} of {$ordered} now delivered.";

        if ($target) {
            $message .= " Moved back to {$target->stage_name}.";
        }

        return back()->with('stock_returned', $message);
    }

    /** The softcopy is private, so it is only served to logged-in users. */
    public function drFile(Delivery $delivery)
    {
        abort_unless(
            $delivery->dr_file_path && Storage::disk('local')->exists($delivery->dr_file_path),
            404
        );

        return Storage::disk('local')->response($delivery->dr_file_path, $delivery->dr_file_name);
    }

    private function discardFile(?string $path): void
    {
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }
}