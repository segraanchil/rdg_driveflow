<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legal_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            // 'invoice' covers the Invoice Generation use case (UC-20) — invoices are
            // generated PDFs tied to a sale just like the deed/OR, so they share this
            // table rather than getting a near-duplicate one of their own.
            $table->enum('doc_type', ['invoice', 'deed_of_sale', 'official_receipt']);
            $table->string('file_path');
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_documents');
    }
};
