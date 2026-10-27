<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $t) {
            $t->id();
            $t->string('po_number', 30)->nullable()->unique();
            $t->string('supplier', 120);
            $t->string('status', 20)->default('draft')->index();   // draft | ordered | partial | received | cancelled
            $t->date('order_date');
            $t->date('expected_date')->nullable();
            $t->decimal('amount', 12, 2)->default(0);
            $t->string('note', 500)->nullable();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('purchase_order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $t->string('item_name')->nullable();
            $t->string('brand_name')->nullable();
            $t->unsignedInteger('quantity');
            $t->unsignedInteger('received_quantity')->default(0);
            $t->decimal('unit_cost', 12, 2);
            $t->timestamps();
        });

        // Link receipts to the PO that produced them.
        Schema::table('stock_receipts', function (Blueprint $t) {
            $t->foreignId('purchase_order_id')->nullable()->after('id')
                ->constrained('purchase_orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('stock_receipts', fn (Blueprint $t) => $t->dropConstrainedForeignId('purchase_order_id'));
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};