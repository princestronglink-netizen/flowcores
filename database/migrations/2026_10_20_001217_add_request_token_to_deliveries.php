<?php
// php artisan make:migration add_request_token_to_deliveries

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $t) {
            $t->string('request_token', 64)->nullable()->unique()->after('is_return');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', fn (Blueprint $t) => $t->dropColumn('request_token'));
    }
};