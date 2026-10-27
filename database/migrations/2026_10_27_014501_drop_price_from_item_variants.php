<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            if (Schema::hasColumn('item_variants', 'price')) {
                $table->dropColumn('price');
            }
            if (Schema::hasColumn('item_variants', 'reorder_level')) {
                $table->dropColumn('reorder_level');
            }
        });
    }

    public function down(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('price', 12, 2)->default(0);
        });
    }
};