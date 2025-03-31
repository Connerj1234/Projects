'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Switch,
  Text,
  useColorModeValue,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  VStack,
  FormHelperText,
  InputGroup,
  InputRightElement,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { BsCalendar3, BsList } from 'react-icons/bs';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { BsFilter } from 'react-icons/bs';
import useStore from '@/store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@chakra-ui/react';
import { Class } from '../types';
import { SemesterModal } from './SemesterModal';
import { EditSemesterModal } from './EditSemesterModal';

function ViewControlsContent() {
  const [mounted, setMounted] = useState(false);
  const { isOpen: isSemesterModalOpen, onOpen: onSemesterModalOpen, onClose: onSemesterModalClose } = useDisclosure();
  const { isOpen: isEditSemesterModalOpen, onOpen: onEditSemesterModalOpen, onClose: onEditSemesterModalClose } = useDisclosure();
  const [selectedSemesterForEdit, setSelectedSemesterForEdit] = useState<string>('');

  // Class management state
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#3182CE');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [selectedClassForColor, setSelectedClassForColor] = useState<string | null>(null);

  const {
    viewMode,
    setViewMode,
    filterOptions,
    setFilterOptions,
    classes,
    assignmentTypes,
    semesters,
    removeSemester,
    addClass,
  } = useStore();

  const toast = useToast();

  // Get classes for selected semester
  const semesterClasses = classes.filter(c => c.semesterId === filterOptions.selectedSemester);

  // Dark mode colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const iconColor = useColorModeValue('gray.600', 'whiteAlpha.800');
  const activeButtonBg = useColorModeValue('blue.500', 'blue.200');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const inputBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.500');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    if (!filterOptions.selectedSemester) {
      toast({
        title: "Please select a semester first",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newClass: Class = {
      id: uuidv4(),
      name: newClassName.trim(),
      color: newClassColor,
      semesterId: filterOptions.selectedSemester,
    };

    addClass(newClass);
    setNewClassName('');
    setNewClassColor('#3182CE');
    setIsAddingClass(false);
    toast({
      title: "Class created",
      description: `${newClassName} has been created`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSemesterCreated = (semesterId: string) => {
    // Update filter options with the new semester
    setFilterOptions({ ...filterOptions, selectedSemester: semesterId });
    // Close the modal
    onSemesterModalClose();
    // Show success toast
    toast({
      title: "Semester created",
      description: "New semester has been created and selected",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleEditSemester = (semesterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSemesterForEdit(semesterId);
    onEditSemesterModalOpen();
  };

  if (!mounted) {
    return null;
  }

  return (
    <Box py={3} px={8} borderBottomWidth="1px" borderColor={borderColor} bg={bgColor}>
      <Flex gap={8} align="center">
        <Flex gap={4} align="center">
          <Text fontWeight="medium" color={textColor}>View:</Text>
          <IconButton
            aria-label="List view"
            icon={<BsList />}
            variant={viewMode === 'list' ? 'solid' : 'ghost'}
            onClick={() => setViewMode('list')}
            color={viewMode === 'list' ? 'white' : iconColor}
            bg={viewMode === 'list' ? activeButtonBg : 'transparent'}
            _hover={{ bg: viewMode === 'list' ? activeButtonBg : buttonHoverBg }}
          />
          <IconButton
            aria-label="Calendar view"
            icon={<BsCalendar3 />}
            variant={viewMode === 'calendar' ? 'solid' : 'ghost'}
            onClick={() => setViewMode('calendar')}
            color={viewMode === 'calendar' ? 'white' : iconColor}
            bg={viewMode === 'calendar' ? activeButtonBg : 'transparent'}
            _hover={{ bg: viewMode === 'calendar' ? activeButtonBg : buttonHoverBg }}
          />
        </Flex>

        <HStack spacing={6}>
          {/* Semester Selection Menu */}
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="ghost"
              rightIcon={<BsCalendar3 />}
              color={filterOptions.selectedSemester ? "blue.500" : textColor}
            >
              {filterOptions.selectedSemester
                ? semesters.find(s => s.id === filterOptions.selectedSemester)?.name || 'Select Semester'
                : 'Select Semester'}
            </MenuButton>
            <MenuList bg={bgColor} borderColor={borderColor} minW="200px">
              <MenuItem
                onClick={() => setFilterOptions({ ...filterOptions, selectedSemester: '' })}
                bg={!filterOptions.selectedSemester ? buttonHoverBg : undefined}
              >
                All Semesters
              </MenuItem>
              <MenuDivider />
              {semesters.length === 0 ? (
                <MenuItem isDisabled>No semesters available</MenuItem>
              ) : (
                semesters.map((semester) => (
                  <MenuItem
                    key={semester.id}
                    onClick={() => setFilterOptions({ ...filterOptions, selectedSemester: semester.id })}
                    bg={filterOptions.selectedSemester === semester.id ? buttonHoverBg : undefined}
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
                          onClick={(e) => handleEditSemester(semester.id, e)}
                        />
                        <IconButton
                          aria-label="Delete semester"
                          icon={<DeleteIcon />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSemester(semester.id);
                          }}
                        />
                      </HStack>
                    </HStack>
                  </MenuItem>
                ))
              )}
              <MenuDivider />
              <MenuItem
                icon={<AddIcon />}
                onClick={onSemesterModalOpen}
              >
                Create Semester
              </MenuItem>
            </MenuList>
          </Menu>

          {/* Filter Classes Menu */}
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="ghost"
              rightIcon={<BsFilter />}
              color={filterOptions.selectedClasses.length > 0 ? "blue.500" : textColor}
            >
              Filter Classes {filterOptions.selectedClasses.length > 0 && `(${filterOptions.selectedClasses.length})`}
            </MenuButton>
            <MenuList bg={bgColor} borderColor={borderColor} minW="200px">
              {isAddingClass ? (
                <Box p={2}>
                  <InputGroup size="md">
                    <Input
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Enter class name"
                      pr="4.5rem"
                      bg={inputBg}
                      borderColor={borderColor}
                      color={textColor}
                      _placeholder={{ color: placeholderColor }}
                      height="40px"
                    />
                    <InputRightElement width="4.5rem" height="40px">
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Pick color"
                          icon={
                            <Box
                              w="3"
                              h="3"
                              borderRadius="full"
                              bg={newClassColor}
                              border="1px solid"
                              borderColor={borderColor}
                            />
                          }
                          onClick={() => setSelectedClassForColor('new')}
                          size="sm"
                          height="32px"
                        />
                        <IconButton
                          aria-label="Create class"
                          icon={<AddIcon />}
                          onClick={handleAddClass}
                          isDisabled={!newClassName.trim() || !filterOptions.selectedSemester}
                          size="sm"
                          height="32px"
                        />
                      </HStack>
                    </InputRightElement>
                  </InputGroup>
                  <Button
                    size="sm"
                    width="full"
                    mt={2}
                    variant="ghost"
                    onClick={() => {
                      setIsAddingClass(false);
                      setNewClassName('');
                      setNewClassColor('#3182CE');
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              ) : (
                <>
                  <MenuItem
                    icon={<AddIcon />}
                    onClick={() => setIsAddingClass(true)}
                  >
                    Create Class
                  </MenuItem>
                  {semesterClasses.length > 0 && <MenuDivider />}
                  {semesterClasses.length === 0 ? (
                    <MenuItem isDisabled>No classes available</MenuItem>
                  ) : (
                    <>
                      <MenuItem
                        onClick={() => {
                          const allClassIds = semesterClasses.map(c => c.id);
                          const newSelectedClasses = filterOptions.selectedClasses.length === allClassIds.length ? [] : allClassIds;
                          setFilterOptions({ ...filterOptions, selectedClasses: newSelectedClasses });
                        }}
                      >
                        <Checkbox
                          isChecked={filterOptions.selectedClasses.length === semesterClasses.length}
                          isIndeterminate={filterOptions.selectedClasses.length > 0 && filterOptions.selectedClasses.length < semesterClasses.length}
                        >
                          Select All
                        </Checkbox>
                      </MenuItem>
                      <MenuDivider />
                      {semesterClasses.map((c) => (
                        <MenuItem
                          key={c.id}
                          onClick={() => {
                            const newSelectedClasses = filterOptions.selectedClasses.includes(c.id)
                              ? filterOptions.selectedClasses.filter(id => id !== c.id)
                              : [...filterOptions.selectedClasses, c.id];
                            setFilterOptions({ ...filterOptions, selectedClasses: newSelectedClasses });
                          }}
                        >
                          <Checkbox isChecked={filterOptions.selectedClasses.includes(c.id)}>
                            <HStack spacing={2}>
                              <Box w="3" h="3" borderRadius="full" bg={c.color} />
                              <Text>{c.name}</Text>
                            </HStack>
                          </Checkbox>
                        </MenuItem>
                      ))}
                    </>
                  )}
                </>
              )}
            </MenuList>
          </Menu>

          {/* Filter Types Menu */}
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="ghost"
              rightIcon={<BsFilter />}
              color={filterOptions.selectedTypes.length > 0 ? "blue.500" : textColor}
            >
              Filter Types {filterOptions.selectedTypes.length > 0 && `(${filterOptions.selectedTypes.length})`}
            </MenuButton>
            <MenuList bg={bgColor} borderColor={borderColor} minW="200px">
              {assignmentTypes.length === 0 ? (
                <MenuItem isDisabled>No types available</MenuItem>
              ) : (
                <>
                  <MenuItem
                    onClick={() => {
                      const allTypeIds = assignmentTypes.map(t => t.id);
                      const newSelectedTypes = filterOptions.selectedTypes.length === allTypeIds.length ? [] : allTypeIds;
                      setFilterOptions({ ...filterOptions, selectedTypes: newSelectedTypes });
                    }}
                  >
                    <Checkbox
                      isChecked={filterOptions.selectedTypes.length === assignmentTypes.length}
                      isIndeterminate={filterOptions.selectedTypes.length > 0 && filterOptions.selectedTypes.length < assignmentTypes.length}
                    >
                      Select All
                    </Checkbox>
                  </MenuItem>
                  <MenuDivider />
                  {assignmentTypes.map((type) => (
                    <MenuItem
                      key={type.id}
                      onClick={() => {
                        const newSelectedTypes = filterOptions.selectedTypes.includes(type.id)
                          ? filterOptions.selectedTypes.filter(id => id !== type.id)
                          : [...filterOptions.selectedTypes, type.id];
                        setFilterOptions({ ...filterOptions, selectedTypes: newSelectedTypes });
                      }}
                    >
                      <Checkbox isChecked={filterOptions.selectedTypes.includes(type.id)}>
                        <HStack spacing={2}>
                          <Box w="3" h="3" borderRadius="full" bg={type.color} />
                          <Text>{type.name}</Text>
                        </HStack>
                      </Checkbox>
                    </MenuItem>
                  ))}
                </>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Create Semester Modal */}
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

export default function ViewControls() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Box as="div">
      <ViewControlsContent />
    </Box>
  );
}
