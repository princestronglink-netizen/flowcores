<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // add_deducts_stock_to_pipeline_stages_table
    public function up(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->boolean('deducts_stock')->default(false)->after('is_final');
        });
    }

    public function down(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->dropColumn('deducts_stock');
        });
    }
};
