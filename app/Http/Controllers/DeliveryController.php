<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Models\Delivery;
use App\Models\Transaction;
use Illuminate\Http\Request;
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

    /** DR: optional delivery receipt number + softcopy. Deliveries only, not returns. */
    private function drRules(): array
    {
        return [
            'dr_number' => 'nullable|string|max:60',
            'dr_file'   => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240', // 10 MB
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
        $validated = $request->validate($this->rules() + $this->drRules()); // DR

        // DR: save the softcopy on the private disk first; it is removed again if the delivery fails.
        $file = $request->file('dr_file');
        $path = $file?->store("delivery-receipts/{$transaction->id}", 'local');

        try {
            $delivery = $transaction->recordDelivery(
                $validated['items'],
                auth()->id(),
                $validated['note'] ?? null,
                $validated['request_token'] ?? null,
                [ // DR
                    'dr_number'    => filled($validated['dr_number'] ?? null) ? trim($validated['dr_number']) : null,
                    'dr_file_path' => $path,
                    'dr_file_name' => $file?->getClientOriginalName(),
                ],
            );
        } catch (InsufficientStockException $e) {
            $this->discardFile($path); // DR

            // Shown inside the modal, which stays open. Nothing was saved.
            return back()->withErrors(['items' => 'Delivery not recorded. ' . $e->getMessage()]);
        } catch (\RuntimeException $e) {
            $this->discardFile($path); // DR

            return back()->withErrors(['items' => $e->getMessage()]);
        } catch (\Throwable $e) {
            $this->discardFile($path); // DR

            throw $e;
        }

        // DR: a double click / network retry returned the first delivery, so the new file is not used.
        if (! $delivery->wasRecentlyCreated) {
            $this->discardFile($path);
        }

        [$ordered, $delivered] = $this->totals($transaction);

        return back()->with('stock', $delivered >= $ordered
            ? "\"{$transaction->name}\" fully delivered ({$delivered}/{$ordered}). You can move it forward now."
            : "Partial delivery saved: {$delivered} of {$ordered} delivered. Deliver the rest whenever it's ready.");
    }

    /** Return delivered items: restock the good ones, write off the rest, replace or reduce the order. */
    public function returnItems(Request $request, Transaction $transaction)
    {
        $validated = $request->validate($this->returnRules());

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

        // Only move back if the card is past delivery AND something still has to be (re)delivered.
        $target = $transaction->isFullyDelivered()
            ? null
            : $transaction->returnToDeliveryStage(auth()->id(), 'Items returned: sent back to delivery');

        $items      = $delivery->items()->get();
        $returned   = (int) abs($items->sum('quantity'));
        $writtenOff = (int) $items->sum('written_off_quantity');
        $restocked  = $returned - $writtenOff;
        $cancelled  = (int) abs($items->where('needs_replacement', false)->sum('quantity'));

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

    /** DR: the softcopy is private, so it is only served to logged-in users (route is in the auth group). */
    public function drFile(Delivery $delivery)
    {
        abort_unless(
            $delivery->dr_file_path && Storage::disk('local')->exists($delivery->dr_file_path),
            404
        );

        return Storage::disk('local')->response($delivery->dr_file_path, $delivery->dr_file_name);
    }

    /** DR: delete an uploaded softcopy that is not going to be used. */
    private function discardFile(?string $path): void
    {
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }
}