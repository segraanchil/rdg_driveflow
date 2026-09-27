<?php

return [

    'mail' => [
        'ses' => [
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        ],
    ],

    // Optional AI provider for the chatbot widget's automated replies before
    // it escalates to a human agent. Blank = chatbot stays in "human handoff
    // only" mode. Fill in once an API key is available.
    'ai_chat' => [
        'provider' => env('AI_CHAT_PROVIDER'),
        'api_key' => env('AI_CHAT_API_KEY'),
    ],

];
