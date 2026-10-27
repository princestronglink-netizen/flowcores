<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ItemController extends Controller
{
    public function index()
    {
        return Inertia::render('Item/Index', [
            'items' => Item::with([
                'category',
                'brands.variants' => fn ($q) => $q->withDemand(),
            ])->latest()->get(),
            'categories' => ItemCategory::orderBy('category_name')->get(['id', 'category_name']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Item/Create', [
            'categories' => ItemCategory::orderBy('category_name')->get(['id', 'category_name']),
            'units'      => $this->unitSuggestions(),
        ]);
    }

    public function edit(Item $item)
    {
        return Inertia::render('Item/Edit', [
            'item'       => $item->load(['brands.variants' => fn ($q) => $q->withDemand()]),
            'categories' => ItemCategory::orderBy('category_name')->get(['id', 'category_name']),
            'units'      => $this->unitSuggestions(),
        ]);
    }

    /**
     * Every unit of measure already used by any variant, so user-defined
     * units get suggested (and reused) in future forms.
     */
    private function unitSuggestions(): array
    {
        // Resolve the variant model through the relations, so no model name is hard-coded.
        $variantModel = (new Item)->brands()->getRelated()->variants()->getRelated();

        return $variantModel->newQuery()
            ->whereNotNull('unit_of_measure')
            ->where('unit_of_measure', '!=', '')
            ->distinct()
            ->orderBy('unit_of_measure')
            ->pluck('unit_of_measure')
            ->all();
    }

    protected function rules(): array
    {
        return [
            'item_category_id'                    => 'nullable|exists:item_categories,id',
            'item_name'                           => 'required|string|max:255',
            'description'                         => 'nullable|string',
            'brands'                              => 'required|array|min:1',
            'brands.*.id'                         => 'nullable|integer',
            'brands.*.brand_name'                 => 'required|string|max:255',
            'brands.*.variants'                   => 'required|array|min:1',
            'brands.*.variants.*.id'              => 'nullable|integer',
            // User-defined: any text is accepted.
            'brands.*.variants.*.unit_of_measure' => 'required|string|max:50',
            'brands.*.variants.*.size'            => 'nullable|string|max:100',
            // Opening stock for NEW variants only. Existing stock changes go through Stock in / Stock out / Adjust stock.
            'brands.*.variants.*.stock'           => 'required|integer|min:0',
        ];
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        DB::transaction(function () use ($validated) {
            $item = Item::create([
                'item_category_id' => $validated['item_category_id'] ?? null,
                'item_name'        => $validated['item_name'],
                'description'      => $validated['description'] ?? null,
            ]);

            $this->syncBrands($item, $validated['brands']);
        });

        return redirect()->route('items.index');
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate($this->rules());

        DB::transaction(function () use ($validated, $item) {
            $item->update([
                'item_category_id' => $validated['item_category_id'] ?? null,
                'item_name'        => $validated['item_name'],
                'description'      => $validated['description'] ?? null,
            ]);

            $this->syncBrands($item, $validated['brands']);
        });

        return redirect()->route('items.index');
    }

    public function destroy(Item $item)
    {
        // Fails if any variant is used in a transaction (restrictOnDelete).
        try {
            $item->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            return back()->withErrors([
                'delete' => 'This item has variants used in transactions and cannot be deleted.',
            ]);
        }

        return redirect()->route('items.index');
    }

    /**
     * Create/update brands and variants while keeping existing IDs,
     * so transaction lines that point to a variant stay valid.
     * Stock of an existing variant is NEVER overwritten from the form
     * (a stale form would wipe out deliveries made in the meantime).
     * Price and reorder level no longer exist as inputs; the reorder level is computed automatically.
     */
    private function syncBrands(Item $item, array $brands): void
    {
        $keptBrandIds = [];

        foreach ($brands as $brandData) {
            $brand = ! empty($brandData['id'])
                ? $item->brands()->find($brandData['id'])
                : null;

            if ($brand) {
                $brand->update(['brand_name' => $brandData['brand_name']]);
            } else {
                $brand = $item->brands()->create(['brand_name' => $brandData['brand_name']]);
            }

            $keptBrandIds[] = $brand->id;
            $keptVariantIds = [];

            foreach ($brandData['variants'] as $variantData) {
                $attributes = [
                    'unit_of_measure' => trim($variantData['unit_of_measure']),
                    'size'            => $variantData['size'] ?? null,
                ];

                $variant = ! empty($variantData['id'])
                    ? $brand->variants()->find($variantData['id'])
                    : null;

                if ($variant) {
                    $variant->update($attributes);
                } else {
                    $variant = $brand->variants()->create($attributes + ['stock' => 0]);

                    if ((int) $variantData['stock'] > 0) {
                        $variant->applyStock((int) $variantData['stock'], StockMovement::TYPE_OPENING, [
                            'user_id'   => auth()->id(),
                            'reference' => "Item: {$item->item_name}",
                        ]);
                    }
                }

                $keptVariantIds[] = $variant->id;
            }

            $brand->variants()->whereNotIn('id', $keptVariantIds)->delete();
        }

        $item->brands()->whereNotIn('id', $keptBrandIds)->delete();
    }
}