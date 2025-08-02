const config: ClientConfig = {
    INDEXEDDB_VER: import.meta.env.VITE_INDEXEDDB_VER,
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.0.0',
    DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',

    BUNNYCDN_GET_ACCESS_KEY: import.meta.env.VITE_BUNNYCDN_GET_ACCESS_KEY,
    BUNNYCDN_GET_HOST: import.meta.env.VITE_BUNNYCDN_GET_HOST
};

// Freeze the config to prevent accidental modifications
export default Object.freeze(config);
