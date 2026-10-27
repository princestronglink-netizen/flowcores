<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->foreignId('item_variant_id')
                ->after('transaction_id')
                ->constrained('item_variants')
                ->restrictOnDelete();   

            $table->dropColumn('item_name');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('item_variant_id');
            $table->string('item_name')->after('transaction_id');
        });
    }
};
