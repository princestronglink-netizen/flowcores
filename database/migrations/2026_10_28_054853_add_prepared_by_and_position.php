<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('position')->nullable()->after('email');
        });

        Schema::table('transactions', function (Blueprint $t) {
            $t->string('prepared_by')->nullable();
            $t->string('prepared_by_position')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropColumn('position');
        });

        Schema::table('transactions', function (Blueprint $t) {
            $t->dropColumn(['prepared_by', 'prepared_by_position']);
        });
    }
};