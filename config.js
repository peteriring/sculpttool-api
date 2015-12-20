'use strict';
/* jshint undef: true, unused: true, node: true */
module.exports = function () {
    
    return {
        port: process.env.PORT || 9000, 
        redisUrl: process.env.REDIS_URL || 'localhost',
        redisPort: process.env.REDIS_PORT || 6379,
        log: 'debug'
    }
};
