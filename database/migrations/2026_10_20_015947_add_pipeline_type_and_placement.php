<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipelines', function (Blueprint $t) {
            $t->string('type', 20)->default('transaction')->after('id')->index(); // transaction | quotation | purchase_order
        });

        foreach (['quotations', 'purchase_orders'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->foreignId('pipeline_id')->nullable()->constrained('pipelines')->nullOnDelete();
                $t->foreignId('pipeline_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['quotations', 'purchase_orders'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropConstrainedForeignId('pipeline_stage_id');
                $t->dropConstrainedForeignId('pipeline_id');
            });
        }

        Schema::table('pipelines', fn (Blueprint $t) => $t->dropColumn('type'));
    }
};