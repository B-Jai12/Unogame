// Firebase module declarations for TypeScript compatibility
// Firebase v10 uses package.json "exports" fields which require this
// when moduleResolution is not bundler/node16.

declare module 'firebase/app';
declare module 'firebase/auth';
declare module 'firebase/firestore';
declare module 'firebase/storage';
declare module 'firebase/functions';
declare module 'firebase/analytics';
declare module 'firebase/performance';
