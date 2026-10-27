<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->unsignedInteger('version')->default(0)->after('quotation_number'); // 0 = initial
        });

        Schema::create('quotation_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version');          // the version that was replaced
            $table->string('quotation_number');          // number it had at that time
            $table->json('snapshot');                    // header fields + items
            $table->foreignId('edited_by')->nullable();  // who made the change that replaced it
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_versions');
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn('version');
        });
    }
};