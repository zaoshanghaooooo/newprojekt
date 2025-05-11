'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '@/theme/system'; // Import the theme

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}> {/* Apply the theme */}
        {children}
      </ChakraProvider>
    </CacheProvider>
  )
}