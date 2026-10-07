<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Current stage the transaction is sitting in. Nullable so
            // existing rows don't break; back-fill in a follow-up step
            // (see the seeder notes) or default it in application code
            // when a transaction is created.
            $table->foreignId('pipeline_stage_id')
                ->nullable()
                ->after('pipeline_id')
                ->constrained('pipeline_stages')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pipeline_stage_id');
        });
    }
};