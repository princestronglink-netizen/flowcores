<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesPerPage;
use App\Models\ActivityLog;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * PERMISSIONS (ItemPolicy):
 *   index            -> viewAny (item.view)
 *   create / store   -> create  (item.create)
 *   edit / update    -> update  (item.edit)
 *   destroy          -> delete  (item.delete)
 */
class ItemController extends Controller
{
    use ResolvesPerPage;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Item::class);

        $stock    = $request->string('stock')->toString();      // all | restock | out
        $search   = trim($request->string('search')->toString());
        $category = $request->string('category')->toString();   // '' | none | <id>
        $perPage  = $this->perPage($request);

        $stock = in_array($stock, ['restock', 'out'], true) ? $stock : 'all';

        $items = Item::with([
                'category',
                'brands.variants' => fn ($q) => $q->withDemand(),
            ])
            ->when($stock === 'out', fn ($q) => $q->whereHas(
                'brands.variants', fn ($v) => $v->outOfStock()
            ))
            ->when($stock === 'restock', fn ($q) => $q->whereHas(
                'brands.variants', fn ($v) => $v->needsRestock()
            ))
            ->when($category === 'none', fn ($q) => $q->whereNull('item_category_id'))
            ->when(ctype_digit($category), fn ($q) => $q->where('item_category_id', (int) $category))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . addcslashes($search, '%_\\') . '%';

                $q->where(function ($q) use ($like) {
                    $q->where('item_name', 'like', $like)
                        ->orWhereHas('category', fn ($c) => $c->where('category_name', 'like', $like))
                        ->orWhereHas('brands', fn ($b) => $b->where('brand_name', 'like', $like));
                });
            })
            ->latest()
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Item/Index', [
            'items'      => $items,
            'categories' => ItemCategory::orderBy('category_name')->get(['id', 'category_name']),
            'filters'    => [
                'stock'    => $stock,
                'search'   => $search,
                'category' => $category,
                'per_page' => $perPage,
            ],
            'counts'     => [
                'all'     => Item::count(),
                'restock' => Item::whereHas('brands.variants', fn ($v) => $v->needsRestock())->count(),
                'out'     => Item::whereHas('brands.variants', fn ($v) => $v->outOfStock())->count(),
            ],
        ]);
    }

    public function create()
    {
        Gate::authorize('create', Item::class);

        return Inertia::render('Item/Create', [
            'categories' => ItemCategory::orderBy('category_name')->get(['id', 'category_name']),
        ]);
    }

    public function edit(Item $item)
    {
        Gate::authorize('update', $item);

        return Inertia::render('Item/Edit', [
            'item'       => $item->load(['brands.variants' => fn ($q) => $q->withDemand()]),
            'categories' => ItemCategory::orderBy('category_name')->get(['id', 'category_name']),
        ]);
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
            'brands.*.variants.*.unit_of_measure' => 'required|string|max:50',
            'brands.*.variants.*.size'            => 'nullable|string|max:100',
            'brands.*.variants.*.stock'           => 'required|integer|min:0',
        ];
    }

    /** Compact picture of an item for the activity log (no stock numbers: those live in the ledger). */
    private function snapshot(Item $item): array
    {
        $item->load('brands.variants');

        return [
            'item_name'        => $item->item_name,
            'item_category_id' => $item->item_category_id,
            'description'      => $item->description,
            'brands'           => $item->brands->map(fn ($b) => [
                'brand'    => $b->brand_name,
                'variants' => $b->variants->pluck('label')->all(),
            ])->all(),
        ];
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Item::class);

        $validated = $request->validate($this->rules());

        $item = DB::transaction(function () use ($validated) {
            $item = Item::create([
                'item_category_id' => $validated['item_category_id'] ?? null,
                'item_name'        => $validated['item_name'],
                'description'      => $validated['description'] ?? null,
            ]);

            $this->syncBrands($item, $validated['brands']);

            return $item;
        });

        ActivityLog::record(
            'item.created',
            "Created item “{$item->item_name}”",
            $item,
            ['new' => $this->snapshot($item)],
            $item->item_name,
        );

        return redirect()->route('items.index');
    }

    public function update(Request $request, Item $item)
    {
        Gate::authorize('update', $item);

        $validated = $request->validate($this->rules());

        $before = $this->snapshot($item);

        DB::transaction(function () use ($validated, $item) {
            $item->update([
                'item_category_id' => $validated['item_category_id'] ?? null,
                'item_name'        => $validated['item_name'],
                'description'      => $validated['description'] ?? null,
            ]);

            $this->syncBrands($item, $validated['brands']);
        });

        $after = $this->snapshot($item->refresh());

        if ($before !== $after) {
            ActivityLog::record(
                'item.updated',
                "Updated item “{$item->item_name}”",
                $item,
                ['old' => $before, 'new' => $after],
                $item->item_name,
            );
        }

        return redirect()->route('items.index');
    }

    public function destroy(Item $item)
    {
        Gate::authorize('delete', $item);

        $before = $this->snapshot($item);
        $name   = $item->item_name;

        try {
            $item->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            return back()->withErrors([
                'delete' => 'This item has variants used in transactions and cannot be deleted.',
            ]);
        }

        ActivityLog::record(
            'item.deleted',
            "Deleted item “{$name}”",
            $item,
            ['old' => $before],
            $name,
        );

        return redirect()->route('items.index');
    }

    /**
     * Create/update brands and variants while keeping existing IDs,
     * so transaction lines that point to a variant stay valid.
     * Stock of an existing variant is NEVER overwritten from the form.
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