// system.ts for Chakra UI theme configuration
// We will adapt this for Chakra UI v2

import { extendTheme } from '@chakra-ui/react';

// Example basic theme extension
const theme = extendTheme({
  colors: {
    brand: {
      100: '#f7fafc',
      // ...
      900: '#1a202c',
    },
  },
});

export default theme;