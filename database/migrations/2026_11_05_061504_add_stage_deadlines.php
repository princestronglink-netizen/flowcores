<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            // How many days a card may stay in this stage (null = no limit).
            $table->unsignedSmallInteger('max_days')->nullable()->after('sort_order');
        });

        Schema::table('transactions', function (Blueprint $table) {
            // When the card entered its CURRENT stage (the count starts here).
            $table->timestamp('stage_entered_at')->nullable()->after('pipeline_stage_id');
        });

        // Backfill existing cards: latest history row of the current stage, else created_at.
        DB::statement("
            UPDATE transactions t SET stage_entered_at = COALESCE(
                (SELECT MAX(h.created_at)
                   FROM transaction_stage_histories h
                  WHERE h.transaction_id = t.id
                    AND h.pipeline_stage_id = t.pipeline_stage_id),
                t.created_at
            )
        ");
    }

    public function down(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->dropColumn('max_days');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('stage_entered_at');
        });
    }
};