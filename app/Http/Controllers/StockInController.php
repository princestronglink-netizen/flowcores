<?php

namespace App\Http\Controllers;

use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockInController extends Controller
{
    public function index()
    {
        return Inertia::render('Stock/In', [
            'variants' => $this->variantOptions(),
            'receipts' => StockReceipt::with(['items.variant.brand.item', 'user:id,name'])
                ->latest('received_at')
                ->latest('id')
                ->limit(10)
                ->get(),
        ]);
    }

    /** Receive stock: one receipt, many lines. All or nothing, every line goes to the ledger. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier'                => 'nullable|string|max:120',
            'reference'               => 'nullable|string|max:120',
            'received_at'             => 'required|date|before_or_equal:today',
            'note'                    => 'nullable|string|max:255',
            'items'                   => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|integer|exists:item_variants,id',
            'items.*.quantity'        => 'required|integer|min:1|max:1000000',
        ]);

        // Same variant on two rows? Add them up.
        $lines = collect($validated['items'])
            ->groupBy('item_variant_id')
            ->map(fn ($rows) => (int) $rows->sum('quantity'));

        $receipt = DB::transaction(function () use ($validated, $lines) {
            $receipt = StockReceipt::create([
                'supplier'    => $validated['supplier'] ?? null,
                'reference'   => $validated['reference'] ?? null,
                'received_at' => $validated['received_at'],
                'note'        => $validated['note'] ?? null,
                'received_by' => auth()->id(),
            ]);

            // Lock in id order so two people receiving at once can't deadlock.
            $variants = ItemVariant::whereIn('id', $lines->keys())->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            $label = collect(["Receipt #{$receipt->id}", $receipt->supplier, $receipt->reference])->filter()->implode(' · ');

            foreach ($lines as $variantId => $qty) {
                $receipt->items()->create(['item_variant_id' => $variantId, 'quantity' => $qty]);

                $variants[$variantId]->applyStock($qty, StockMovement::TYPE_STOCK_IN, [
                    'user_id'   => auth()->id(),
                    'reference' => $label,
                    'note'      => $receipt->note,
                ]);
            }

            return $receipt;
        });

        $units = $lines->sum();

        return back()->with('stock', "Receipt #{$receipt->id} saved: {$units} unit(s) added to stock across {$lines->count()} item(s).");
    }

    /** Flat list for the picker: "Paint — Boysen (pcs · 4 L)". */
    private function variantOptions()
    {
        return ItemVariant::with('brand.item')
            ->get()
            ->map(fn (ItemVariant $v) => [
                'id'     => $v->id,
                'label'  => $v->brand->item->item_name . ' — ' . $v->brand->brand_name
                          . ' (' . collect([$v->unit_of_measure, $v->size])->filter()->implode(' · ') . ')',
                'stock'  => (int) $v->stock,
                // stock_status exists once ItemVariant has the optional reorder-level upgrade.
                'status' => $v->stock_status ?? ($v->stock > 0 ? 'ok' : 'out'),
            ])
            ->sortBy('label', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }
}