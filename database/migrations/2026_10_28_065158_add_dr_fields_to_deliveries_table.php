<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('dr_number', 60)->nullable()->after('note')->index();
            $table->string('dr_file_path')->nullable()->after('dr_number');
            $table->string('dr_file_name')->nullable()->after('dr_file_path');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['dr_number', 'dr_file_path', 'dr_file_name']);
        });
    }
};