<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $t) {
            $t->id();
            $t->string('quotation_number', 30)->nullable()->unique();
            $t->string('subject');
            $t->foreignId('client_id')->constrained()->cascadeOnDelete();
            $t->foreignId('client_contact_person_id')->constrained('client_contact_people')->cascadeOnDelete();
            $t->string('status', 20)->default('draft')->index();   // draft | sent | accepted | rejected
            $t->date('valid_until')->nullable();
            $t->decimal('amount', 12, 2)->default(0);
            $t->text('note')->nullable();
            $t->text('terms')->nullable();
            $t->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('quotation_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $t->string('item_name')->nullable();
            $t->string('brand_name')->nullable();
            $t->unsignedInteger('quantity');
            $t->decimal('unit_price', 12, 2);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
    }
};