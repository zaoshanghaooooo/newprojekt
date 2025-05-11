'use client';

import { 
  Box, 
  Flex, 
  HStack, 
  IconButton, 
  Button, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem, 
  MenuDivider, 
  useDisclosure, 
  useColorModeValue, 
  Stack, 
  Text
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: '首页',
    href: '/',
  },
  {
    label: '订单列表',
    href: '/orders',
  },
  {
    label: '菜品管理',
    href: '/dishes',
  },
  {
    label: '打印日志',
    href: '/logs',
  },
  {
    label: '系统设置',
    href: '/settings',
  },
];

export default function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const pathname = usePathname();

  return (
    <Box bg={useColorModeValue('white', 'gray.900')} px={4} boxShadow="sm">
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <IconButton
          size={'md'}
          icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
          aria-label={'打开菜单'}
          display={{ md: 'none' }}
          onClick={isOpen ? onClose : onOpen}
        />
        <HStack spacing={8} alignItems={'center'}>
          <Box>
            <Text fontSize="lg" fontWeight="bold">猫咪打印机</Text>
          </Box>
          <HStack as={'nav'} spacing={4} display={{ base: 'none', md: 'flex' }}>
            {NAV_ITEMS.map((navItem) => (
              <Link key={navItem.label} href={navItem.href} passHref>
                <Button
                  px={2}
                  py={1}
                  rounded={'md'}
                  variant={pathname === navItem.href ? 'solid' : 'ghost'}
                  colorScheme={pathname === navItem.href ? 'blue' : undefined}
                  _hover={{
                    textDecoration: 'none',
                    bg: useColorModeValue('gray.200', 'gray.700'),
                  }}
                >
                  {navItem.label}
                </Button>
              </Link>
            ))}
          </HStack>
        </HStack>
      </Flex>

      {isOpen ? (
        <Box pb={4} display={{ md: 'none' }}>
          <Stack as={'nav'} spacing={4}>
            {NAV_ITEMS.map((navItem) => (
              <Link key={navItem.label} href={navItem.href} passHref>
                <Button
                  w="full"
                  px={2}
                  py={1}
                  rounded={'md'}
                  variant={pathname === navItem.href ? 'solid' : 'ghost'}
                  colorScheme={pathname === navItem.href ? 'blue' : undefined}
                  _hover={{
                    textDecoration: 'none',
                    bg: useColorModeValue('gray.200', 'gray.700'),
                  }}
                >
                  {navItem.label}
                </Button>
              </Link>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
} 