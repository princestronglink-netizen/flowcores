<?php

namespace App\Http\Controllers;

use App\Models\ItemCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ItemCategoryController extends Controller
{
    public function index()
    {
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
        ItemCategory::create($request->validate($this->rules()));

        return back();
    }

    public function update(Request $request, ItemCategory $category)
    {
        $category->update($request->validate($this->rules($category)));

        return back();
    }

    /** Items in this category stay; they just become "Uncategorized". */
    public function destroy(ItemCategory $category)
    {
        $category->delete();

        return back();
    }

    /** Used by the "New" button inside the item form. */
    public function quickStore(Request $request)
    {
        $category = ItemCategory::create($request->validate($this->rules()));

        return response()->json($category->only('id', 'category_name'));
    }
}
