<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Item;
use App\Models\ItemVariant;

trait HandlesLineItems
{
    protected function catalog()
    {
        return Item::with('category', 'brands.variants')->orderBy('item_name')->get();
    }

    /** Fill item_name / brand_name on the server so the browser can't send wrong values. */
    protected function buildItemRows(array $items, string $priceField = 'unit_price'): array
    {
        $variants = ItemVariant::with('brand.item')
            ->whereIn('id', collect($items)->pluck('item_variant_id'))
            ->get()
            ->keyBy('id');

        return collect($items)->map(function ($row) use ($variants, $priceField) {
            $variant = $variants[$row['item_variant_id']];

            return [
                'item_variant_id' => $variant->id,
                'item_name'       => $variant->brand->item->item_name,
                'brand_name'      => $variant->brand->brand_name,
                'quantity'        => (int) $row['quantity'],
                $priceField       => $row[$priceField],
            ];
        })->all();
    }
}