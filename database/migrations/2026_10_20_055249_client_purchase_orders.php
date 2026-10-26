<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('cpo_number')->nullable()->unique();      // our own number: CPO-2026-00001
            $table->string('client_po_number')->nullable();          // the number printed on the client's PO
            $table->date('client_po_date')->nullable();
            $table->string('status')->default('draft');              // draft | confirmed | cancelled
            $table->decimal('amount', 14, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamp('confirmed_at')->nullable();

            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('quotation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_id')->constrained();
            $table->foreignId('client_contact_person_id')->nullable()->constrained('client_contact_people')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('client_purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $table->string('item_name');
            $table->string('brand_name')->nullable();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 14, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_purchase_order_items');
        Schema::dropIfExists('client_purchase_orders');
    }
};