<?php

namespace App\Http\Controllers;

use App\Models\ItemCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * PERMISSIONS (ItemCategoryPolicy):
 *   index               -> viewAny (category.view)
 *   store, quickStore   -> create  (category.create)
 *   update              -> update  (category.edit)
 *   destroy             -> delete  (category.delete)
 */
class ItemCategoryController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', ItemCategory::class);

        return Inertia::render('Category/Index', [
            'categories' => ItemCategory::withCount('items')->orderBy('category_name')->get(),
        ]);
    }

    protected function rules(?ItemCategory $category = null): array
    {
        return [
            'category_name' => [
                'required', 'string', 'max:255',
                Rule::unique('item_categories', 'category_name')->ignore($category?->id),
            ],
            'description' => 'nullable|string|max:500',
        ];
    }

    public function store(Request $request)
    {
        Gate::authorize('create', ItemCategory::class);

        ItemCategory::create($request->validate($this->rules()));

        return back();
    }

    public function update(Request $request, ItemCategory $category)
    {
        Gate::authorize('update', $category);

        $category->update($request->validate($this->rules($category)));

        return back();
    }

    /** Items in this category stay; they just become "Uncategorized". */
    public function destroy(ItemCategory $category)
    {
        Gate::authorize('delete', $category);

        $category->delete();

        return back();
    }

    /** Used by the "New" button inside the item form. Needs category.create. */
    public function quickStore(Request $request)
    {
        Gate::authorize('create', ItemCategory::class);

        $category = ItemCategory::create($request->validate($this->rules()));

        return response()->json($category->only('id', 'category_name'));
    }
}