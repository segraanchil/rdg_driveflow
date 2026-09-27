<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/** A buyer's own completed purchases — feeds "My Garage" purchase history and the warranty claim sale picker. */
class SaleController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->sales()->with('vehicle')->latest('sale_date')->get()
        );
    }
}
