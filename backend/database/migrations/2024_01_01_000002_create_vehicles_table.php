<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('make');
            $table->string('model');
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('mileage');
            $table->decimal('acquisition_cost', 12, 2);
            $table->decimal('repair_fees', 12, 2)->default(0);
            // CEO-configured global margin (10-18%), overridable per vehicle.
            $table->decimal('margin_percent', 5, 2);
            $table->decimal('selling_price', 12, 2);
            $table->string('status')->default('available'); // available|reserved|sold|under_repair
            // Drives the "Last Updated" stamp on the 360-degree viewer.
            $table->timestamp('last_updated')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
