<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $movements = StockMovement::with(['variant.brand.item', 'user:id,name', 'transaction:id,name'])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%' . $request->string('search') . '%';

                $q->whereHas('variant.brand', function ($b) use ($term) {
                    $b->where('brand_name', 'like', $term)
                        ->orWhereHas('item', fn ($i) => $i->where('item_name', 'like', $term));
                });
            })
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Stock/Movements', [
            'movements' => $movements,
            'filters'   => $request->only('search', 'type'),
            'types'     => StockMovement::TYPES,
        ]);
    }
}
