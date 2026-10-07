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
        Schema::create('pipeline_stages', function (Blueprint $table) {
            $table->id();

            // Which pipeline this stage belongs to. Deleting a pipeline
            // deletes its stages too.
            $table->foreignId('pipeline_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('stage_code');   // e.g. "request", "negotiation"
            $table->string('stage_name');   // e.g. "Request", "Negotiation"
            $table->string('stage_description')->nullable();

            // Determines display/progress order within the pipeline.
            $table->unsignedInteger('sort_order')->default(0);

            // Flags so app logic doesn't have to hardcode stage names.
            $table->boolean('is_initial')->default(false); // first stage a new transaction lands in
            $table->boolean('is_final')->default(false);   // e.g. "Payment" — pipeline is complete

            $table->timestamps();

            // A stage code only needs to be unique within its own pipeline,
            // so two different pipelines can both have a "request" stage.
            $table->unique(['pipeline_id', 'stage_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pipeline_stages');
    }
};