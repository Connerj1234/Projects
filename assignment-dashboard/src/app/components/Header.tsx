'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Select,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  HStack,
  Text,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';
import { NewAssignmentModal } from '@/components/NewAssignmentModal';
import { SemesterModal } from '@/components/SemesterModal';
import { EditSemesterModal } from '@/components/EditSemesterModal';

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);
  const {
    filterOptions,
    setFilterOptions,
    semesters,
    removeSemester,
  } = useStore();
  const { isOpen: isSemesterModalOpen, onOpen: onSemesterModalOpen, onClose: onSemesterModalClose } = useDisclosure();
  const { isOpen: isEditSemesterModalOpen, onOpen: onEditSemesterModalOpen, onClose: onEditSemesterModalClose } = useDisclosure();
  const [selectedSemesterForEdit, setSelectedSemesterForEdit] = useState<string>('');
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const selectBg = useColorModeValue('white', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.300');
  const iconColor = useColorModeValue('gray.600', 'whiteAlpha.900');

  const handleRemoveSemester = (semesterId: string) => {
    const semester = semesters.find(s => s.id === semesterId);
    if (semester) {
      removeSemester(semesterId);
      if (filterOptions.selectedSemester === semesterId) {
        setFilterOptions({ selectedSemester: '' });
      }
      toast({
        title: 'Semester removed',
        description: `Successfully removed ${semester.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSemesterCreated = (semesterId: string) => {
    setFilterOptions({ selectedSemester: semesterId });
    toast({
      title: 'Semester created',
      description: 'New semester has been created and selected',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleEditSemester = (semesterId: string) => {
    setSelectedSemesterForEdit(semesterId);
    onEditSemesterModalOpen();
  };

  return (
    <Box
      py={4}
      px={8}
      borderBottomWidth="1px"
      borderColor={borderColor}
      bg={bgColor}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center">
        <Flex gap={2} align="center">
          {/* Semester Selection */}
          <FormControl maxW="300px">
            <Select
              value={filterOptions.selectedSemester}
              onChange={(e) => setFilterOptions({ ...filterOptions, selectedSemester: e.target.value })}
              bg={selectBg}
              color={textColor}
              borderColor={borderColor}
              size="sm"
              placeholder="All Semesters"
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <Menu>
            <MenuButton
              as={Button}
              leftIcon={<AddIcon />}
              size="sm"
              variant="ghost"
              color={iconColor}
              _hover={{ bg: buttonHoverBg }}
            >
              Manage Semesters
            </MenuButton>
            <MenuList bg={bgColor} borderColor={borderColor}>
              <MenuItem
                onClick={onSemesterModalOpen}
                icon={<AddIcon />}
                bg={bgColor}
                _hover={{ bg: buttonHoverBg }}
                color={textColor}
              >
                Add Semester
              </MenuItem>
              {semesters.length > 0 && <MenuDivider />}
              {semesters.map((semester) => (
                <MenuItem
                  key={semester.id}
                  bg={bgColor}
                  _hover={{ bg: buttonHoverBg }}
                  color={textColor}
                >
                  <HStack justify="space-between" width="100%">
                    <Text>{semester.name}</Text>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Edit semester"
                        icon={<EditIcon />}
                        size="xs"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSemester(semester.id);
                        }}
                      />
                      <IconButton
                        aria-label="Delete semester"
                        icon={<DeleteIcon />}
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSemester(semester.id);
                        }}
                      />
                    </HStack>
                  </HStack>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>

        <Flex gap={4} align="center">
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => setIsNewAssignmentModalOpen(true)}
          >
            New Assignment
          </Button>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            color={iconColor}
            _hover={{ bg: buttonHoverBg }}
          />
        </Flex>
      </Flex>

      <NewAssignmentModal
        isOpen={isNewAssignmentModalOpen}
        onClose={() => setIsNewAssignmentModalOpen(false)}
      />

      <SemesterModal
        isOpen={isSemesterModalOpen}
        onClose={onSemesterModalClose}
        onSemesterCreated={handleSemesterCreated}
      />
      <EditSemesterModal
        isOpen={isEditSemesterModalOpen}
        onClose={onEditSemesterModalClose}
        semesterId={selectedSemesterForEdit}
      />
    </Box>
  );
}
