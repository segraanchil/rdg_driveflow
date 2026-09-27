<?php

use App\Http\Controllers\Admin\AcquisitionLeadReviewController;
use App\Http\Controllers\Admin\FinancingReviewController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\LegalDocumentController;
use App\Http\Controllers\Admin\ReservationQueueController;
use App\Http\Controllers\Admin\SaleController;
use App\Http\Controllers\Admin\WarrantyClaimReviewController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MfaController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Buyer\ChatController;
use App\Http\Controllers\Buyer\FinancingApplicationController;
use App\Http\Controllers\Buyer\GarageController;
use App\Http\Controllers\Buyer\LoanCalculatorController;
use App\Http\Controllers\Buyer\ReservationController;
use App\Http\Controllers\Admin\TestDriveController as AdminTestDriveController;
use App\Http\Controllers\Buyer\SaleController as BuyerSaleController;
use App\Http\Controllers\Buyer\SavedVehicleController;
use App\Http\Controllers\Buyer\TestDriveController as BuyerTestDriveController;
use App\Http\Controllers\Buyer\VehicleController;
use App\Http\Controllers\Buyer\WarrantyClaimController;
use App\Http\Controllers\Ceo\DashboardController;
use App\Http\Controllers\Ceo\ExpansionFundController;
use App\Http\Controllers\Ceo\MarginSettingController;
use App\Http\Controllers\Ceo\StaffController;
use App\Http\Controllers\Seller\AcquisitionLeadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes — no login required
|--------------------------------------------------------------------------
| Vehicle browsing, the loan calculator, and the chatbot widget are all
| reachable by anonymous visitors per the spec.
*/
Route::get('/vehicles', [VehicleController::class, 'index']);
Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show']);
Route::post('/loan-calculator', [LoanCalculatorController::class, 'calculate']);
Route::get('/financing/checklist/{employmentProfile}', [FinancingApplicationController::class, 'checklist']);
Route::post('/chat/message', [ChatController::class, 'sendMessage']);
Route::post('/chat/escalate', [ChatController::class, 'escalate']);

/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/
Route::post('/auth/register', [RegisterController::class, 'register']);
Route::post('/auth/login', [LoginController::class, 'login']);
Route::get('/auth/verify-email/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware('signed')
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [LoginController::class, 'logout']);
    Route::get('/auth/me', [LoginController::class, 'me']);
    Route::post('/auth/mfa/verify', [MfaController::class, 'verify']);
    Route::post('/auth/mfa/resend', [MfaController::class, 'resend']);

    /*
    |----------------------------------------------------------------------
    | Buyer — "My Garage" (reservations, financing, warranty claims, chat
    | history). MFA-gated, like every other role.
    |----------------------------------------------------------------------
    */
    Route::middleware(['role:buyer', 'mfa'])->prefix('buyer')->group(function () {
        Route::get('/garage', [GarageController::class, 'index']);

        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);

        Route::get('/test-drives', [BuyerTestDriveController::class, 'index']);
        Route::post('/test-drives', [BuyerTestDriveController::class, 'store']);

        Route::get('/financing-applications', [FinancingApplicationController::class, 'index']);
        Route::post('/financing-applications', [FinancingApplicationController::class, 'store']);
        Route::post('/financing-applications/{application}/documents', [FinancingApplicationController::class, 'uploadDocument']);

        Route::get('/warranty-claims', [WarrantyClaimController::class, 'index']);
        Route::post('/warranty-claims', [WarrantyClaimController::class, 'store']);

        Route::get('/sales', [BuyerSaleController::class, 'index']);

        Route::post('/saved-vehicles/{vehicle}', [SavedVehicleController::class, 'store']);
        Route::delete('/saved-vehicles/{vehicle}', [SavedVehicleController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Seller — "Sell Your Car" + appraisal status tracker. MFA-gated.
    |----------------------------------------------------------------------
    */
    Route::middleware(['role:seller', 'mfa'])->prefix('seller')->group(function () {
        Route::get('/acquisition-leads', [AcquisitionLeadController::class, 'index']);
        Route::post('/acquisition-leads', [AcquisitionLeadController::class, 'store']);
        Route::get('/acquisition-leads/{lead}', [AcquisitionLeadController::class, 'show']);
    });

    /*
    |----------------------------------------------------------------------
    | Admin — MFA-gated. Inventory, reservation/payment verification,
    | financing review, invoices, legal docs, warranty claims.
    |----------------------------------------------------------------------
    */
    Route::middleware(['role:admin', 'mfa'])->prefix('admin')->group(function () {
        // ->parameters() keeps the {vehicle} wildcard name in sync with InventoryController's
        // Vehicle $vehicle type-hint, since implicit route-model binding matches by name.
        Route::apiResource('inventory', InventoryController::class)
            ->parameters(['inventory' => 'vehicle'])
            ->only(['index', 'store', 'update', 'destroy']);

        Route::get('/reservations', [ReservationQueueController::class, 'index']);
        Route::post('/reservations/{reservation}/verify', [ReservationQueueController::class, 'verify']);
        Route::post('/reservations/{reservation}/reject', [ReservationQueueController::class, 'reject']);

        Route::get('/test-drives', [AdminTestDriveController::class, 'index']);
        Route::patch('/test-drives/{testDrive}/confirm', [AdminTestDriveController::class, 'confirm']);
        Route::patch('/test-drives/{testDrive}/decline', [AdminTestDriveController::class, 'decline']);

        Route::get('/financing-applications', [FinancingReviewController::class, 'index']);
        Route::post('/financing-documents/{document}/verify', [FinancingReviewController::class, 'verifyDocument']);
        Route::get('/financing-documents/{document}/download', [FinancingReviewController::class, 'downloadDocument']);

        Route::get('/sales', [SaleController::class, 'index']);
        Route::get('/sales/create-options', [SaleController::class, 'createOptions']);
        Route::post('/sales', [SaleController::class, 'store']);
        Route::post('/sales/{sale}/invoice', [InvoiceController::class, 'store']);
        Route::post('/sales/{sale}/legal-documents', [LegalDocumentController::class, 'store']);

        Route::get('/warranty-claims', [WarrantyClaimReviewController::class, 'index']);
        Route::patch('/warranty-claims/{claim}', [WarrantyClaimReviewController::class, 'update']);
    });

    /*
    |----------------------------------------------------------------------
    | CEO — MFA-gated. Executive dashboard, expansion fund, global margin.
    |----------------------------------------------------------------------
    */
    Route::middleware(['role:ceo', 'mfa'])->prefix('ceo')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/expansion-fund', [ExpansionFundController::class, 'index']);
        Route::get('/margin-setting', [MarginSettingController::class, 'show']);
        Route::put('/margin-setting', [MarginSettingController::class, 'update']);

        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::patch('/staff/{staff}', [StaffController::class, 'update']);
        Route::patch('/staff/{staff}/deactivate', [StaffController::class, 'deactivate']);
        Route::patch('/staff/{staff}/activate', [StaffController::class, 'activate']);
    });

    /*
    |----------------------------------------------------------------------
    | Shared — Acquisition lead review (Admin + CEO both have access).
    |----------------------------------------------------------------------
    */
    Route::middleware(['role:admin,ceo', 'mfa'])->prefix('shared')->group(function () {
        Route::get('/acquisition-leads', [AcquisitionLeadReviewController::class, 'index']);
        Route::patch('/acquisition-leads/{lead}', [AcquisitionLeadReviewController::class, 'update']);
    });
});
