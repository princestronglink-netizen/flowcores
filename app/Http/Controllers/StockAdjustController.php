<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Models\ActivityLog;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * PERMISSIONS (StockMovementPolicy):
 *   index        -> adjust (stock.adjust)
 *   store        -> adjust (stock.adjust)
 */
class StockAdjustController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('adjust', StockMovement::class);

        return Inertia::render('Stock/Adjust', [
            'variants'  => $this->variantOptions(),
            'recent'    => StockMovement::with(['variant.brand.item', 'user:id,name'])
                ->where('type', StockMovement::TYPE_ADJUSTMENT)
                ->latest('id')
                ->limit(10)
                ->get(),
            'preselect' => $request->integer('variant') ?: null,
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('adjust', StockMovement::class);

        $validated = $request->validate([
            'direction'               => ['required', Rule::in(['in', 'out'])],
            'reason'                  => ['required', Rule::in(array_keys(
                StockMovement::ADJUST_REASONS_IN + StockMovement::ADJUST_REASONS_OUT
            ))],
            'note'                    => [
                Rule::requiredIf(fn () => $request->input('reason') === 'other'),
                'nullable', 'string', 'max:255',
            ],
            'items'                   => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|integer|exists:item_variants,id',
            'items.*.quantity'        => 'required|integer|min:1|max:1000000',
        ], [
            'note.required' => 'Add a short note explaining why when the reason is "Other".',
        ]);

        $isIn    = $validated['direction'] === 'in';
        $reasons = $isIn ? StockMovement::ADJUST_REASONS_IN : StockMovement::ADJUST_REASONS_OUT;

        if (! array_key_exists($validated['reason'], $reasons)) {
            throw ValidationException::withMessages([
                'reason' => 'That reason does not match adding/removing stock.',
            ]);
        }

        $sign        = $isIn ? 1 : -1;
        $reasonLabel = $reasons[$validated['reason']];

        $lines = collect($validated['items'])
            ->groupBy('item_variant_id')
            ->map(fn ($rows) => (int) $rows->sum('quantity'));

        try {
            DB::transaction(function () use ($validated, $lines, $sign, $isIn, $reasonLabel) {
                $variants = ItemVariant::with('brand.item')
                    ->whereIn('id', $lines->keys())
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                if (! $isIn) {
                    $short = [];
                    foreach ($lines as $variantId => $qty) {
                        $variant   = $variants[$variantId];
                        $available = (int) $variant->stock;

                        if ($available < $qty) {
                            $short[] = "{$variant->brand->item->item_name} — {$variant->brand->brand_name} (in stock {$available}, removing {$qty})";
                        }
                    }

                    if ($short) {
                        throw new InsufficientStockException('Not enough stock: ' . implode('; ', $short) . '.');
                    }
                }

                foreach ($lines as $variantId => $qty) {
                    $variants[$variantId]->applyStock($sign * $qty, StockMovement::TYPE_ADJUSTMENT, [
                        'user_id'   => auth()->id(),
                        'reference' => 'Adjustment: ' . $reasonLabel,
                        'reason'    => $validated['reason'],
                        'note'      => $validated['note'] ?? null,
                    ]);
                }
            });
        } catch (InsufficientStockException $e) {
            return back()->withErrors(['items' => 'Nothing was changed. ' . $e->getMessage()]);
        }

        $units = $lines->sum();
        $verb  = $isIn ? 'added to' : 'removed from';

        ActivityLog::record(
            'stock.adjusted',
            "{$units} unit(s) {$verb} stock across {$lines->count()} item(s). Reason: {$reasonLabel}",
            null,
            [
                'direction' => $validated['direction'],
                'reason'    => $validated['reason'],
                'note'      => $validated['note'] ?? null,
                'lines'     => $lines->all(), // variant_id => quantity
            ],
        );

        return back()->with('stock', "{$units} unit(s) {$verb} stock across {$lines->count()} item(s). Reason: {$reasonLabel}.");
    }

    private function variantOptions()
    {
        return ItemVariant::with('brand.item')
            ->get()
            ->map(fn (ItemVariant $v) => [
                'id'     => $v->id,
                'label'  => $v->brand->item->item_name . ' — ' . $v->brand->brand_name
                          . ' (' . collect([$v->unit_of_measure, $v->size])->filter()->implode(' · ') . ')',
                'stock'  => (int) $v->stock,
                'status' => $v->stock_status,
            ])
            ->sortBy('label', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }
}