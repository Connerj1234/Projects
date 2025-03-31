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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, AddIcon, DeleteIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';
import { NewAssignmentModal } from '@/components/NewAssignmentModal';

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);
  const {
    filterOptions,
    setFilterOptions,
    semesters,
    addSemester,
    removeSemester,
  } = useStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newSemesterName, setNewSemesterName] = useState('');
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const selectBg = useColorModeValue('white', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.300');
  const iconColor = useColorModeValue('gray.600', 'whiteAlpha.900');
  const labelColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.500');

  const handleAddSemester = () => {
    if (newSemesterName.trim()) {
      const id = newSemesterName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      addSemester({
        id,
        name: newSemesterName.trim()
      });

      toast({
        title: 'Semester added',
        description: `Successfully added ${newSemesterName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setNewSemesterName('');
      onClose();
    }
  };

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
          <Select
            w="200px"
            value={filterOptions.selectedSemester}
            onChange={(e) =>
              setFilterOptions({ selectedSemester: e.target.value })
            }
            bg={selectBg}
            color={textColor}
            borderColor={borderColor}
            _hover={{ bg: buttonHoverBg }}
          >
            <option value="">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </Select>
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
                onClick={onOpen}
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
                  onClick={() => handleRemoveSemester(semester.id)}
                  icon={<DeleteIcon />}
                  bg={bgColor}
                  _hover={{ bg: buttonHoverBg }}
                  color={textColor}
                >
                  Remove {semester.name}
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

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Add New Semester</ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <FormControl>
              <FormLabel color={labelColor}>Semester Name</FormLabel>
              <Input
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="e.g., Fall 2024"
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAddSemester}
              isDisabled={!newSemesterName.trim()}
            >
              Add
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
