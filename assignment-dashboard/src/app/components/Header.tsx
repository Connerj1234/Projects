'use client';

import {
  Box,
  Button,
  Flex,
  HStack,
  Select,
  useColorMode,
  useColorModeValue,
  IconButton,
  useDisclosure,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import useStore from '@/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import { SemesterModal } from '@/components/SemesterModal';
import { NewAssignmentModal } from '@/components/NewAssignmentModal';

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');

  const {
    semesters,
    filterOptions,
    setFilterOptions,
  } = useStore();

  const [selectedSemesterId, setSelectedSemesterId] = useState<string | undefined>(undefined);

  const {
    isOpen: isSemesterModalOpen,
    onOpen: onOpenManageSemesters,
    onClose: onCloseManageSemesters,
  } = useDisclosure();

  const {
    isOpen: isNewAssignmentOpen,
    onOpen: onOpenNewAssignment,
    onClose: onCloseNewAssignment,
  } = useDisclosure();

  // Supabase Auth
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    getUser();

    // Optional: Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Auto-select semester on mount
  useEffect(() => {
    if (!selectedSemesterId && semesters.length > 0) {
      setSelectedSemesterId(filterOptions.selectedSemester || semesters[0].id);
    }
  }, [semesters, filterOptions.selectedSemester]);

  // Sync with filter store
  useEffect(() => {
    if (selectedSemesterId) {
      setFilterOptions((prev) => ({
        ...prev,
        selectedSemester: selectedSemesterId,
      }));
    }
  }, [selectedSemesterId]);

  return (
    <Box
      borderBottom="1px"
      borderColor={borderColor}
      bg={bg}
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        {/* Left: Semester Controls */}
        <HStack spacing={3}>
        <Select
  value={selectedSemesterId || ''}
  onChange={(e) => setSelectedSemesterId(e.target.value)}
  size="sm"
  maxW="170px"
  borderRadius="md"
  border="1px solid"
  borderColor="gray.300"
  fontWeight="medium"
  color="gray.800"
  bg="white"
  _hover={{ borderColor: 'gray.400' }}
  _focus={{ borderColor: 'blue.500', boxShadow: 'sm' }}
  placeholder="Select semester"
>
  {Array.isArray(semesters) &&
    semesters.map((s) => (
      <option key={s.id} value={s.id}>
        {s.name}
      </option>
    ))}
</Select>


          <Button
            onClick={onOpenManageSemesters}
            size="sm"
            variant="outline"
            fontWeight="medium"
            px={4}
            borderRadius="md"
          >
            + Manage Semesters
          </Button>
        </HStack>

        {/* Right: Actions */}
        <HStack spacing={3}>
          <Button colorScheme="blue" size="sm" onClick={onOpenNewAssignment}>
            New Assignment
          </Button>

          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          />

          {/* Supabase Auth Dropdown */}
          {authLoading ? (
            <Spinner size="sm" />
          ) : user ? (
            <Menu>
              <MenuButton as={Button} variant="ghost" size="sm" p={0}>
                <Avatar name={user.email} size="sm" />
              </MenuButton>
              <MenuList>
                <MenuItem isDisabled>
                  <Text fontSize="sm">{user.email}</Text>
                </MenuItem>
                <MenuItem onClick={handleLogout}>Log Out</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button size="sm" onClick={handleLogin}>
              Sign In
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Modals */}
      <SemesterModal isOpen={isSemesterModalOpen} onClose={onCloseManageSemesters} />
      <NewAssignmentModal isOpen={isNewAssignmentOpen} onClose={onCloseNewAssignment} />
    </Box>
  );
}
