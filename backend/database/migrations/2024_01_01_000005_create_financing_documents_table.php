<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financing_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained('financing_applications')->cascadeOnDelete();
            $table->string('file_path');
            // e.g. payslip, coe, itr, business_permit — set depends on employment_profile checklist.
            $table->string('doc_type');
            $table->boolean('verified')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financing_documents');
    }
};
