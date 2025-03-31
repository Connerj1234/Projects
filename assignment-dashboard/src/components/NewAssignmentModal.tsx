'use client';

import { useState, Suspense, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  FormHelperText,
  useToast,
  useColorModeValue,
  IconButton,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Radio,
  RadioGroup,
  Stack,
  Box,
  InputGroup,
  InputRightElement,
  Flex,
  Text,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react';
import { format, addWeeks, addMonths } from 'date-fns';
import { AddIcon, DeleteIcon, EditIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { HexColorPicker } from 'react-colorful';
import useStore from '@/store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { ClassesMenu } from './ViewControls';
import { SemesterModal } from './SemesterModal';
import { RecurringSettingsModal, RecurringSettings } from './RecurringSettingsModal';

type NewAssignmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function NewAssignmentModalContent({ isOpen, onClose }: NewAssignmentModalProps) {
  const {
    classes,
    assignmentTypes,
    semesters,
    addAssignment,
    addClass,
    removeClass,
    addAssignmentType,
    removeAssignmentType,
    updateClassColor,
    updateAssignmentTypeColor,
    addSemester,
  } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [semester, setSemester] = useState('');
  const [isBulkCreate, setIsBulkCreate] = useState(false);
  const [numberOfAssignments, setNumberOfAssignments] = useState(1);

  // New state for class and type management
  const [newClassName, setNewClassName] = useState('');
  const [newTypeTitle, setNewTypeTitle] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [useEndDate, setUseEndDate] = useState(false);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [selectedClassForColor, setSelectedClassForColor] = useState<string | null>(null);
  const [selectedTypeForColor, setSelectedTypeForColor] = useState<string | null>(null);

  // Add new state variables for colors
  const [newClassColor, setNewClassColor] = useState('#3182CE');
  const [newTypeColor, setNewTypeColor] = useState('#3182CE');

  const toast = useToast();

  // Dark mode colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');
  const labelColor = useColorModeValue('gray.700', 'whiteAlpha.800');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.300');

  const {
    isOpen: isSemesterModalOpen,
    onOpen: onSemesterModalOpen,
    onClose: onSemesterModalClose,
  } = useDisclosure();
  const [newSemesterName, setNewSemesterName] = useState('');
  const [newSemesterStartDate, setNewSemesterStartDate] = useState('');
  const [newSemesterEndDate, setNewSemesterEndDate] = useState('');

  const {
    isOpen: isRecurringModalOpen,
    onOpen: onRecurringModalOpen,
    onClose: onRecurringModalClose,
  } = useDisclosure();

  // Get classes for selected semester
  const semesterClasses = classes.filter(c => c.semesterId === semester);

  const handleAddClass = () => {
    if (newClassName.trim() && semester) {
      const id = newClassName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      addClass({
        id,
        name: newClassName.trim(),
        color: newClassColor,
        semesterId: semester,
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
      setIsAddingClass(false);
    } else if (!semester) {
      toast({
        title: 'Select a semester',
        description: 'Please select a semester before adding a class',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddType = () => {
    if (newTypeTitle.trim()) {
      const id = newTypeTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      addAssignmentType({
        id,
        name: newTypeTitle.trim(),
        color: newTypeColor,
      });

      toast({
        title: 'Assignment type added',
        description: `Successfully added ${newTypeTitle}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setNewTypeTitle('');
      setNewTypeColor('#3182CE');
      setIsAddingType(false);
    }
  };

  const handleRecurringSettingsSave = (settings: RecurringSettings) => {
    setRecurrenceType(settings.recurrenceType);
    setRecurrenceCount(settings.recurrenceCount);
    setEndDate(settings.endDate);
    setIsRecurring(true);
  };

  const handleSubmit = () => {
    try {
      const selectedType = assignmentTypes.find(t => t.id === typeId);
      if (!selectedType) {
        toast({
          title: 'Error',
          description: 'Selected assignment type not found',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const baseAssignment = {
        id: Date.now().toString(),
        title,
        description,
        classId,
        type: selectedType,
        semester,
        completed: false,
        dueDate: new Date(dueDate)
      };

      if (isBulkCreate) {
        if (isRecurring) {
          // Create recurring assignments
          const baseDueDate = new Date(dueDate);
          // Set time to noon to avoid timezone issues
          baseDueDate.setHours(12, 0, 0, 0);

          let assignments = [];
          let currentDate = new Date(baseDueDate);
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999); // End of the day

          let i = 0;
          while (currentDate <= endDateObj) {
            const assignmentNumber = (i + 1).toString().padStart(2, '0');

            assignments.push({
              ...baseAssignment,
              id: `${Date.now()}-${i}`,
              title: `${title} ${assignmentNumber}`,
              dueDate: new Date(currentDate),
            });

            // Calculate next date
            if (recurrenceType === 'weekly') {
              currentDate = addWeeks(currentDate, recurrenceCount);
            } else if (recurrenceType === 'biweekly') {
              currentDate = addWeeks(currentDate, 2 * recurrenceCount);
            } else if (recurrenceType === 'monthly') {
              currentDate = addMonths(currentDate, recurrenceCount);
            }

            i++;
          }

          // Add all assignments
          for (const assignment of assignments) {
            try {
              addAssignment(assignment);
            } catch (err) {
              console.error('Failed to add assignment:', assignment, err);
              throw err;
            }
          }

          toast({
            title: 'Assignments created',
            description: `Successfully created ${assignments.length} assignments`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          // Create multiple non-recurring assignments
          for (let i = 1; i <= numberOfAssignments; i++) {
            const assignmentNumber = i.toString().padStart(2, '0');
            const assignmentDate = new Date(dueDate);
            assignmentDate.setHours(12, 0, 0, 0); // Set time to noon

            const assignment = {
              ...baseAssignment,
              id: `${Date.now()}-${i}`,
              title: `${title} ${assignmentNumber}`,
              dueDate: assignmentDate,
            };

            try {
              addAssignment(assignment);
            } catch (err) {
              console.error('Failed to add assignment:', assignment, err);
              throw err;
            }
          }

          toast({
            title: 'Assignments created',
            description: `Successfully created ${numberOfAssignments} assignments`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        // Create single assignment
        try {
          addAssignment(baseAssignment);
        } catch (err) {
          console.error('Failed to add assignment:', baseAssignment, err);
          throw err;
        }

        toast({
          title: 'Assignment created',
          description: 'Successfully created the assignment',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setClassId('');
      setTypeId('');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
      setSemester('');
      setIsBulkCreate(false);
      setNumberOfAssignments(1);
      setIsRecurring(false);
      setRecurrenceType('weekly');
      setRecurrenceCount(1);
    } catch (error) {
      console.error('Assignment creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment(s). Please check the console for details.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleClear = () => {
    // Reset all form fields to initial state
    setTitle('');
    setDescription('');
    setClassId('');
    setTypeId('');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setSemester('');
    setIsBulkCreate(false);
    setNumberOfAssignments(1);
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceCount(1);
    setUseEndDate(false);

    // Show success toast
    toast({
      title: 'Form cleared',
      description: 'All fields have been reset',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleCreateSemester = () => {
    if (!newSemesterName) return;

    const newSemester = {
      id: uuidv4(),
      name: newSemesterName,
      ...(newSemesterStartDate && { startDate: newSemesterStartDate }),
      ...(newSemesterEndDate && { endDate: newSemesterEndDate }),
    };

    addSemester(newSemester);
    setNewSemesterName('');
    setNewSemesterStartDate('');
    setNewSemesterEndDate('');
    onSemesterModalClose();

    // Automatically select the newly created semester
    setSemester(newSemester.id);

    toast({
      title: 'Semester created',
      description: `Successfully created ${newSemesterName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Create New Assignment</ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <HStack justify="space-between" align="center">
                  <FormLabel color={textColor} mb={0}>Semester</FormLabel>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<AddIcon />}
                    onClick={onSemesterModalOpen}
                  >
                    Create Semester
                  </Button>
                </HStack>
                <Select
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setClassId(''); // Reset class selection when semester changes
                  }}
                  placeholder="Select semester"
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                >
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {semester && (
                <>
                  <FormControl isRequired>
                    <FormLabel color={labelColor}>Title</FormLabel>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter assignment title"
                      bg={inputBg}
                      borderColor={borderColor}
                      color={textColor}
                      _placeholder={{ color: placeholderColor }}
                    />
                    {isBulkCreate && (
                      <FormHelperText color={labelColor}>
                        Numbers will be automatically appended (e.g., "Homework 01", "Homework 02")
                      </FormHelperText>
                    )}
                  </FormControl>

                  <FormControl>
                    <FormLabel color={labelColor}>Description</FormLabel>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter assignment description"
                      bg={inputBg}
                      borderColor={borderColor}
                      color={textColor}
                      _placeholder={{ color: placeholderColor }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <HStack justify="space-between" align="center" width="100%">
                      <FormLabel color={labelColor} mb={0}>Class</FormLabel>
                      <Button
                        size="sm"
                        leftIcon={<AddIcon />}
                        onClick={() => setIsAddingClass(true)}
                        variant="ghost"
                        color={textColor}
                        _hover={{ bg: buttonHoverBg }}
                      >
                        Create Class
                      </Button>
                    </HStack>
                    {isAddingClass ? (
                      <Box>
                        <InputGroup>
                          <Input
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="Enter class name"
                            pr="4.5rem"
                            bg={inputBg}
                            borderColor={borderColor}
                            color={textColor}
                            _placeholder={{ color: placeholderColor }}
                            size="md"
                            height="40px"
                          />
                          <InputRightElement width="4.5rem" height="40px">
                            <HStack spacing={1}>
                              <IconButton
                                h="1.75rem"
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
                                onClick={() => setSelectedClassForColor('new')}
                              />
                              <IconButton
                                h="1.75rem"
                                size="sm"
                                aria-label="Create class"
                                icon={<AddIcon />}
                                onClick={handleAddClass}
                                isDisabled={!newClassName.trim() || !semester}
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
                      <Select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        placeholder="Select class"
                        bg={inputBg}
                        borderColor={borderColor}
                        color={textColor}
                        _placeholder={{ color: placeholderColor }}
                      >
                        {semesterClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <HStack justify="space-between" align="center" width="100%">
                      <FormLabel color={labelColor} mb={0}>Type</FormLabel>
                      <Button
                        size="sm"
                        leftIcon={<AddIcon />}
                        onClick={() => setIsAddingType(true)}
                        variant="ghost"
                        color={textColor}
                        _hover={{ bg: buttonHoverBg }}
                      >
                        Create Type
                      </Button>
                    </HStack>
                    {isAddingType ? (
                      <Box>
                        <InputGroup>
                          <Input
                            value={newTypeTitle}
                            onChange={(e) => setNewTypeTitle(e.target.value)}
                            placeholder="Enter type name"
                            pr="4.5rem"
                            bg={inputBg}
                            borderColor={borderColor}
                            color={textColor}
                            _placeholder={{ color: placeholderColor }}
                            size="md"
                            height="40px"
                          />
                          <InputRightElement width="4.5rem" height="40px">
                            <HStack spacing={1}>
                              <IconButton
                                h="1.75rem"
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
                                onClick={() => setSelectedTypeForColor('new')}
                              />
                              <IconButton
                                h="1.75rem"
                                size="sm"
                                aria-label="Create type"
                                icon={<AddIcon />}
                                onClick={handleAddType}
                                isDisabled={!newTypeTitle.trim()}
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
                            setIsAddingType(false);
                            setNewTypeTitle('');
                            setNewTypeColor('#3182CE');
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    ) : (
                      <Select
                        value={typeId}
                        onChange={(e) => setTypeId(e.target.value)}
                        placeholder="Select type"
                        bg={inputBg}
                        borderColor={borderColor}
                        color={textColor}
                        _placeholder={{ color: placeholderColor }}
                      >
                        {assignmentTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color={labelColor}>Due Date</FormLabel>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      bg={inputBg}
                      borderColor={borderColor}
                      color={textColor}
                    />
                  </FormControl>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0" color={labelColor}>Create Multiple Assignments</FormLabel>
                    <Switch
                      isChecked={isBulkCreate}
                      onChange={(e) => {
                        setIsBulkCreate(e.target.checked);
                        if (!e.target.checked) {
                          setIsRecurring(false);
                        }
                      }}
                      colorScheme="blue"
                    />
                  </FormControl>

                  {isBulkCreate && (
                    <>
                      <FormControl>
                        <FormLabel color={labelColor}>Number of Assignments</FormLabel>
                        <NumberInput
                          value={numberOfAssignments}
                          onChange={(_, value) => setNumberOfAssignments(value)}
                          min={1}
                          max={20}
                        >
                          <NumberInputField
                            bg={inputBg}
                            borderColor={borderColor}
                            color={textColor}
                          />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb="0" color={labelColor}>Make Recurring</FormLabel>
                        <HStack spacing={4}>
                          <Switch
                            isChecked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            colorScheme="blue"
                          />
                          {isRecurring && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={onRecurringModalOpen}
                              color={textColor}
                              _hover={{ bg: buttonHoverBg }}
                            >
                              Configure Recurrence
                            </Button>
                          )}
                        </HStack>
                      </FormControl>
                    </>
                  )}
                </>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClear} color={textColor}>
              Clear
            </Button>
            <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isDisabled={!title.trim() || !classId || !typeId || !semester}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Semester Modal */}
      <SemesterModal
        isOpen={isSemesterModalOpen}
        onClose={onSemesterModalClose}
        onSemesterCreated={(newSemesterId) => {
          setSemester(newSemesterId);
        }}
      />

      {/* Recurring Settings Modal */}
      <RecurringSettingsModal
        isOpen={isRecurringModalOpen}
        onClose={onRecurringModalClose}
        onSave={handleRecurringSettingsSave}
        startDate={dueDate}
        numberOfAssignments={numberOfAssignments}
        semester={semester}
      />

      {/* Color picker modal for classes */}
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

      {/* Color picker modal for types */}
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
    </>
  );
}

export function NewAssignmentModal({ isOpen, onClose }: NewAssignmentModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on the server side
  if (!mounted) return null;

  return (
    <Box as="div">
      <NewAssignmentModalContent isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}
