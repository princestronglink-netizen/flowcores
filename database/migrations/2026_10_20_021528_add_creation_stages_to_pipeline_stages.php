<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Undo the multi-pipeline idea if that migration already ran.
        if (Schema::hasColumn('pipelines', 'type')) {
            Schema::table('pipelines', fn (Blueprint $t) => $t->dropColumn('type'));
        }

        Schema::table('pipeline_stages', function (Blueprint $t) {
            $t->boolean('creates_quotation')->default(false)->after('deducts_stock');
            $t->boolean('creates_purchase_order')->default(false)->after('creates_quotation');
        });

        foreach (['quotations', 'purchase_orders'] as $table) {
            if (Schema::hasColumn($table, 'pipeline_stage_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $t) {
                $t->foreignId('pipeline_id')->nullable()->constrained('pipelines')->nullOnDelete();
                $t->foreignId('pipeline_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('pipeline_stages', fn (Blueprint $t) => $t->dropColumn(['creates_quotation', 'creates_purchase_order']));

        foreach (['quotations', 'purchase_orders'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropConstrainedForeignId('pipeline_stage_id');
                $t->dropConstrainedForeignId('pipeline_id');
            });
        }
    }
};