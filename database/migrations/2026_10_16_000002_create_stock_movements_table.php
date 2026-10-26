<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stock ledger: every change to item_variants.stock leaves a row here.
     * quantity     = signed change applied to stock (0 for a pure write-off)
     * written_off  = units that came back but were NOT put back on the shelf
     */
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_variant_id')->constrained('item_variants')->cascadeOnDelete();
            $table->string('type', 30)->index();
            $table->integer('quantity');
            $table->unsignedInteger('written_off')->default(0);
            $table->unsignedInteger('stock_before');
            $table->unsignedInteger('stock_after');
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->foreignId('delivery_id')->nullable()->constrained('deliveries')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference')->nullable();
            $table->string('reason', 100)->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['item_variant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
