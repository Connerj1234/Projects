'use client';

import {
  Box,
  Flex,
  IconButton,
  Switch,
  Text,
  useColorModeValue,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
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
  HStack,
  Select,
  VStack,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { BsCalendar3, BsList } from 'react-icons/bs';
import { AddIcon, DeleteIcon, EditIcon, FilterIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';
import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import React from 'react';

function ViewControls() {
  const {
    viewMode,
    setViewMode,
    filterOptions,
    setFilterOptions,
    classes,
    assignments,
    assignmentTypes,
    addClass,
    removeClass,
    addAssignmentType,
    removeAssignmentType,
    updateClassColor,
    updateAssignmentTypeColor,
    semesters,
  } = useStore();

  const { isOpen: isClassOpen, onOpen: onClassOpen, onClose: onClassClose } = useDisclosure();
  const { isOpen: isTypeOpen, onOpen: onTypeOpen, onClose: onTypeClose } = useDisclosure();
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#3182CE'); // Default blue color
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3182CE'); // Default blue color
  const [selectedClassForColor, setSelectedClassForColor] = useState<string | null>(null);
  const [selectedTypeForColor, setSelectedTypeForColor] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState('');

  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.700', 'whiteAlpha.900');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.300');
  const iconColor = useColorModeValue('gray.600', 'whiteAlpha.900');
  const activeButtonBg = useColorModeValue('blue.500', 'blue.400');

  // Filter classes based on selected semester
  const semesterClasses = filterOptions.selectedSemester
    ? classes.filter(c => c.semesterId === filterOptions.selectedSemester)
    : classes;

  // Assignment types are global, so we don't filter them
  const globalAssignmentTypes = assignmentTypes;

  const handleAddClass = () => {
    if (newClassName.trim()) {
      if (!filterOptions.selectedSemester) {
        toast({
          title: 'Select a semester',
          description: 'Please select a semester before adding a class',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const id = newClassName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      addClass({
        id,
        name: newClassName.trim(),
        color: newClassColor,
        semesterId: filterOptions.selectedSemester,
      });

      toast({
        title: 'Class added',
        description: `Successfully added ${newClassName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setNewClassName('');
      setNewClassColor('#3182CE');
    }
  };

  const handleAddType = () => {
    if (newTypeName.trim()) {
      const id = newTypeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      addAssignmentType({
        id,
        name: newTypeName.trim(),
        color: newTypeColor,
      });

      toast({
        title: 'Assignment type added',
        description: `Successfully added ${newTypeName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setNewTypeName('');
      setNewTypeColor('#3182CE');
    }
  };

  const handleRemoveType = (typeId: string) => {
    // Check if type is in use
    const typeInUse = assignments.some(a => a.type.id === typeId);
    if (typeInUse) {
      toast({
        title: 'Cannot remove type',
        description: 'This assignment type is currently in use by one or more assignments',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    removeAssignmentType(typeId);
    toast({
      title: 'Type removed',
      description: 'Successfully removed the assignment type',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

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
          <Flex align="center" gap={2}>
            <Switch
              isChecked={filterOptions.showCompleted}
              onChange={(e) =>
                setFilterOptions({ ...filterOptions, showCompleted: e.target.checked })
              }
              colorScheme="blue"
              size="md"
            />
            <Text color={textColor}>Show Completed</Text>
          </Flex>

          {/* Manage Classes Menu - Semester Specific */}
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Button}
              leftIcon={<EditIcon />}
              size="sm"
              variant="ghost"
              color={iconColor}
              _hover={{ bg: buttonHoverBg }}
            >
              Manage Classes
            </MenuButton>
            <MenuList bg={bgColor} borderColor={borderColor} minW="200px">
              <Box px={3} py={2}>
                <InputGroup size="sm">
                  <Input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="New class name"
                    pr="4.5rem"
                    bg={bgColor}
                    borderColor={borderColor}
                    color={textColor}
                  />
                  <InputRightElement width="4.5rem">
                    <HStack spacing={1}>
                      <IconButton
                        h="1.5rem"
                        size="sm"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClassForColor('new');
                        }}
                      />
                      <IconButton
                        h="1.5rem"
                        size="sm"
                        aria-label="Add class"
                        icon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddClass();
                        }}
                        isDisabled={!newClassName.trim() || !filterOptions.selectedSemester}
                      />
                    </HStack>
                  </InputRightElement>
                </InputGroup>
              </Box>
              {semesterClasses.length > 0 && (
                <>
                  <MenuDivider />
                  {semesterClasses.map((c) => (
                    <MenuItem key={c.id} closeOnSelect={false}>
                      <Flex justify="space-between" align="center" width="100%">
                        <Text color={textColor}>{c.name}</Text>
                        <HStack spacing={1}>
                          <IconButton
                            size="xs"
                            aria-label="Change color"
                            icon={
                              <Box
                                w="3"
                                h="3"
                                borderRadius="full"
                                bg={c.color}
                                border="1px solid"
                                borderColor={borderColor}
                              />
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClassForColor(c.id);
                            }}
                          />
                          <IconButton
                            size="xs"
                            aria-label="Remove class"
                            icon={<DeleteIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClass(c.id);
                            }}
                            colorScheme="red"
                            variant="ghost"
                          />
                        </HStack>
                      </Flex>
                    </MenuItem>
                  ))}
                </>
              )}
            </MenuList>
          </Menu>

          {/* Manage Types Menu - Global */}
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Button}
              leftIcon={<EditIcon />}
              size="sm"
              variant="ghost"
              color={iconColor}
              _hover={{ bg: buttonHoverBg }}
            >
              Manage Types
            </MenuButton>
            <MenuList bg={bgColor} borderColor={borderColor} minW="200px">
              <Box px={3} py={2}>
                <InputGroup size="sm">
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="New type name"
                    pr="4.5rem"
                    bg={bgColor}
                    borderColor={borderColor}
                    color={textColor}
                  />
                  <InputRightElement width="4.5rem">
                    <HStack spacing={1}>
                      <IconButton
                        h="1.5rem"
                        size="sm"
                        aria-label="Pick color"
                        icon={
                          <Box
                            w="3"
                            h="3"
                            borderRadius="full"
                            bg={newTypeColor}
                            border="1px solid"
                            borderColor={borderColor}
                          />
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTypeForColor('new');
                        }}
                      />
                      <IconButton
                        h="1.5rem"
                        size="sm"
                        aria-label="Add type"
                        icon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddType();
                        }}
                        isDisabled={!newTypeName.trim()}
                      />
                    </HStack>
                  </InputRightElement>
                </InputGroup>
              </Box>
              {globalAssignmentTypes.length > 0 && (
                <>
                  <MenuDivider />
                  {globalAssignmentTypes.map((type) => (
                    <MenuItem key={type.id} closeOnSelect={false}>
                      <Flex justify="space-between" align="center" width="100%">
                        <Text color={textColor}>{type.name}</Text>
                        <HStack spacing={1}>
                          <IconButton
                            size="xs"
                            aria-label="Change color"
                            icon={
                              <Box
                                w="3"
                                h="3"
                                borderRadius="full"
                                bg={type.color}
                                border="1px solid"
                                borderColor={borderColor}
                              />
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTypeForColor(type.id);
                            }}
                          />
                          <IconButton
                            size="xs"
                            aria-label="Remove type"
                            icon={<DeleteIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveType(type.id);
                            }}
                            colorScheme="red"
                            variant="ghost"
                          />
                        </HStack>
                      </Flex>
                    </MenuItem>
                  ))}
                </>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Color picker modals */}
      <Modal
        isOpen={!!selectedClassForColor}
        onClose={() => setSelectedClassForColor(null)}
      >
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>
            {selectedClassForColor === 'new' ? 'Choose Class Color' : 'Change Class Color'}
          </ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <HexColorPicker
              color={selectedClassForColor === 'new' ? newClassColor : (classes.find((c) => c.id === selectedClassForColor)?.color || '#3182CE')}
              onChange={(color) => {
                if (selectedClassForColor === 'new') {
                  setNewClassColor(color);
                } else if (selectedClassForColor) {
                  updateClassColor(selectedClassForColor, color);
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setSelectedClassForColor(null)} color={textColor}>
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={!!selectedTypeForColor}
        onClose={() => setSelectedTypeForColor(null)}
      >
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>
            {selectedTypeForColor === 'new' ? 'Choose Type Color' : 'Change Type Color'}
          </ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <HexColorPicker
              color={selectedTypeForColor === 'new' ? newTypeColor : (assignmentTypes.find((t) => t.id === selectedTypeForColor)?.color || '#3182CE')}
              onChange={(color) => {
                if (selectedTypeForColor === 'new') {
                  setNewTypeColor(color);
                } else if (selectedTypeForColor) {
                  updateAssignmentTypeColor(selectedTypeForColor, color);
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setSelectedTypeForColor(null)} color={textColor}>
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default ViewControls;
