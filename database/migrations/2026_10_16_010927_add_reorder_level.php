<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Below this number a variant shows as "Low stock". 0 = no warning until it runs out. */
    public function up(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            $table->unsignedInteger('reorder_level')->default(0)->after('stock');
        });
    }

    public function down(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            $table->dropColumn('reorder_level');
        });
    }
};