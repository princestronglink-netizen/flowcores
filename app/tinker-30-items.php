<?php

use App\Models\Item;
use App\Models\ItemBrand;
use App\Models\ItemCategory;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

/*
 * category => [ item name => [ brand => [ [unit, size, opening stock], ... ] ] ]
 */
$catalog = [
    'Paint' => [
        'Latex Paint' => [
            'Boysen' => [['gal', '1', 40], ['pail', '4', 15]],
            'Davies' => [['gal', '1', 25], ['pail', '4', 10]],
        ],
        'Semi-Gloss Enamel' => [
            'Boysen' => [['gal', '1', 30], ['qt', '1', 45]],
        ],
        'Flat Wall Primer' => [
            'Davies' => [['gal', '1', 28], ['pail', '4', 12]],
        ],
        'Paint Thinner' => [
            'Generic' => [['ltr', '1', 60], ['gal', '1', 20]],
        ],
        'Paint Brush' => [
            'Generic' => [['pcs', '1"', 50], ['pcs', '2"', 50], ['pcs', '4"', 35]],
        ],
    ],

    'Electrical' => [
        'THHN Wire' => [
            'Phelps Dodge' => [['roll', '2.0 mm', 12], ['roll', '3.5 mm', 8], ['roll', '5.5 mm', 5]],
        ],
        'Circuit Breaker' => [
            'Schneider' => [['pcs', '20A', 30], ['pcs', '30A', 18], ['pcs', '60A', 10]],
        ],
        'Electrical Tape' => [
            '3M' => [['roll', 'Black', 120], ['roll', 'Red', 40]],
        ],
        'Convenience Outlet' => [
            'Panasonic' => [['pcs', '2-gang', 60], ['pcs', '3-gang', 35]],
        ],
        'Wall Switch' => [
            'Panasonic' => [['pcs', '1-gang', 70], ['pcs', '2-gang', 40]],
        ],
        'LED Bulb' => [
            'Philips' => [['pcs', '7W', 90], ['pcs', '9W', 80], ['pcs', '12W', 60]],
        ],
    ],

    'Fasteners' => [
        'Common Nails' => [
            'Generic' => [['kg', '2"', 100], ['kg', '3"', 80], ['kg', '4"', 0]],
        ],
        'Concrete Nails' => [
            'Generic' => [['kg', '2"', 40], ['kg', '3"', 30]],
        ],
        'Wood Screws' => [
            'Generic' => [['box', '1"', 25], ['box', '1.5"', 25], ['box', '2"', 20]],
        ],
        'Hex Bolts and Nuts' => [
            'Generic' => [['pcs', '1/4"', 200], ['pcs', '3/8"', 150], ['pcs', '1/2"', 100]],
        ],
        'Flat Washers' => [
            'Generic' => [['pcs', '1/4"', 300], ['pcs', '3/8"', 250]],
        ],
    ],

    'Plumbing' => [
        'PVC Pipe' => [
            'Neltex' => [['pcs', '1/2"', 80], ['pcs', '3/4"', 60], ['pcs', '2"', 25], ['pcs', '4"', 15]],
        ],
        'PVC Elbow' => [
            'Neltex' => [['pcs', '1/2"', 150], ['pcs', '3/4"', 120], ['pcs', '2"', 40]],
        ],
        'Gate Valve' => [
            'Generic' => [['pcs', '1/2"', 20], ['pcs', '3/4"', 15], ['pcs', '1"', 10]],
        ],
        'Teflon Tape' => [
            'Generic' => [['roll', '1/2"', 200]],
        ],
        'PVC Solvent Cement' => [
            'Oatey' => [['can', '118 ml', 40], ['can', '237 ml', 25]],
        ],
        'Lavatory Faucet' => [
            'Toyo' => [['pcs', 'Chrome', 18], ['pcs', 'Brushed', 8]],
        ],
    ],

    'Tools' => [
        'Claw Hammer' => [
            'Stanley' => [['pcs', '8 oz', 15], ['pcs', '16 oz', 20]],
        ],
        'Measuring Tape' => [
            'Stanley' => [['pcs', '5 m', 30], ['pcs', '8 m', 20]],
        ],
        'Hand Saw' => [
            'Stanley' => [['pcs', '18"', 12], ['pcs', '22"', 10]],
        ],
        'Screwdriver Set' => [
            'Stanley' => [['set', '6 pcs', 14], ['set', '12 pcs', 8]],
        ],
    ],

    'Cement & Masonry' => [
        'Portland Cement' => [
            'Republic' => [['bag', '40 kg', 300]],
            'Holcim'   => [['bag', '40 kg', 250]],
        ],
        'Washed Sand' => [
            'Local' => [['cu.m', '1', 40]],
        ],
        'Hollow Blocks' => [
            'Local' => [['pcs', '4"', 800], ['pcs', '6"', 500]],
        ],
        'Tie Wire' => [
            'Generic' => [['kg', '#16', 120], ['roll', '25 kg', 10]],
        ],
    ],
];

$created = 0;

DB::transaction(function () use ($catalog, &$created) {
    foreach ($catalog as $categoryName => $items) {
        $category = ItemCategory::firstOrCreate(['category_name' => $categoryName]);

        foreach ($items as $itemName => $brands) {
            $item = Item::firstOrCreate([
                'item_category_id' => $category->id,
                'item_name'        => $itemName,
            ]);

            if ($item->wasRecentlyCreated) {
                $created++;
            }

            foreach ($brands as $brandName => $variants) {
                $brand = ItemBrand::firstOrCreate([
                    'item_id'    => $item->id,
                    'brand_name' => $brandName,
                ]);

                foreach ($variants as [$unit, $size, $stock]) {
                    $variant = ItemVariant::firstOrCreate([
                        'item_brand_id'   => $brand->id,
                        'unit_of_measure' => $unit,
                        'size'            => $size,
                    ], ['stock' => 0]);

                    // Opening stock only for new variants, so re-running never doubles it.
                    if ($variant->wasRecentlyCreated && $stock > 0) {
                        $variant->applyStock($stock, StockMovement::TYPE_OPENING, [
                            'reference' => "Item: {$item->item_name}",
                        ]);
                    }
                }
            }
        }
    }
});

echo "New items: {$created}" . PHP_EOL
    . 'Totals - Categories: ' . ItemCategory::count()
    . ' | Items: ' . Item::count()
    . ' | Brands: ' . ItemBrand::count()
    . ' | Variants: ' . ItemVariant::count() . PHP_EOL;