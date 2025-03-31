'use client';

import { useState, useMemo, useEffect } from 'react';
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
  FormHelperText,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  RadioGroup,
  Radio,
  Stack,
  VStack,
  useColorModeValue,
  HStack,
  Tooltip,
  Icon,
  Text,
  Alert,
  AlertIcon,
  Box,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { format, addWeeks, addMonths } from 'date-fns';
import useStore from '@/store/useStore';

type RecurringSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: RecurringSettings) => void;
  startDate: string;
  numberOfAssignments: number;
  semester: string;
};

export type RecurringSettings = {
  recurrenceType: 'weekly' | 'biweekly' | 'monthly';
  recurrenceCount: number;
  endDate: string;
};

export function RecurringSettingsModal({ isOpen, onClose, onSave, startDate, numberOfAssignments, semester }: RecurringSettingsModalProps) {
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useNumberOfAssignments, setUseNumberOfAssignments] = useState(true);
  const { semesters } = useStore();

  // Get the current semester's end date
  const semesterEndDate = useMemo(() => {
    const currentSemester = semesters.find(s => s.id === semester);
    return currentSemester?.endDate;
  }, [semester, semesters]);

  // Calculate the number of assignments that will be created
  const calculatedAssignments = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let count = 1; // Start with 1 for the first assignment
    let current = new Date(start);

    // Keep adding assignments until we exceed the end date
    while (true) {
      let nextDate;
      if (recurrenceType === 'weekly') {
        nextDate = addWeeks(current, recurrenceCount);
      } else if (recurrenceType === 'biweekly') {
        nextDate = addWeeks(current, 2 * recurrenceCount);
      } else if (recurrenceType === 'monthly') {
        nextDate = addMonths(current, recurrenceCount);
      }

      // If the next date would be after the end date, stop
      if (nextDate > end) {
        break;
      }

      count++;
      current = nextDate;
    }

    return count;
  }, [startDate, endDate, recurrenceType, recurrenceCount]);

  // Check if there's a mismatch between requested and calculated assignments
  const hasMismatch = useNumberOfAssignments && calculatedAssignments !== numberOfAssignments;

  useEffect(() => {
    // When the modal opens, if there's a semester end date, use it as the default end date
    if (semesterEndDate) {
      setEndDate(semesterEndDate);
      setUseNumberOfAssignments(false);
    }
  }, [semesterEndDate]);

  // Dark mode colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const labelColor = useColorModeValue('gray.700', 'whiteAlpha.800');

  const handleSave = () => {
    onSave({
      recurrenceType,
      recurrenceCount,
      endDate,
    });
    onClose();
  };

  const getTooltipContent = () => {
    switch (recurrenceType) {
      case 'weekly':
        return `Creates assignments every ${recurrenceCount} week(s).\nExample: If set to 2, creates assignments every 2 weeks.`;
      case 'biweekly':
        return `Creates assignments every ${recurrenceCount * 2} weeks.\nExample: If set to 2, creates assignments every 4 weeks.`;
      case 'monthly':
        return `Creates assignments every ${recurrenceCount} month(s).\nExample: If set to 2, creates assignments every 2 months.`;
      default:
        return '';
    }
  };

  // Suggest an end date that matches the number of assignments
  const suggestEndDate = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    let current = new Date(start);

    // We want numberOfAssignments total, so move forward numberOfAssignments - 1 times
    // since we already have the first assignment at the start date
    for (let i = 1; i < numberOfAssignments; i++) {
      if (recurrenceType === 'weekly') {
        current = addWeeks(current, recurrenceCount);
      } else if (recurrenceType === 'biweekly') {
        current = addWeeks(current, 2 * recurrenceCount);
      } else if (recurrenceType === 'monthly') {
        current = addMonths(current, recurrenceCount);
      }
    }

    current.setHours(23, 59, 59, 999);
    setEndDate(format(current, 'yyyy-MM-dd'));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader color={textColor}>Recurring Assignment Settings</ModalHeader>
        <ModalCloseButton color={textColor} />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color={labelColor}>How would you like to set up the recurring assignments?</FormLabel>
              <RadioGroup
                value={useNumberOfAssignments ? 'count' : 'date'}
                onChange={(value) => {
                  setUseNumberOfAssignments(value === 'count');
                  if (value === 'date' && semesterEndDate) {
                    setEndDate(semesterEndDate);
                  } else if (value === 'count') {
                    suggestEndDate();
                  }
                }}
                color={textColor}
              >
                <Stack spacing={4}>
                  <Radio value="count" colorScheme="blue">
                    <Text>I know how many assignments I want to create</Text>
                  </Radio>
                  <Radio value="date" colorScheme="blue" isDisabled={!semesterEndDate}>
                    <Text>I want assignments to repeat until the end of the semester</Text>
                    {!semesterEndDate && (
                      <Text fontSize="sm" color="red.500">
                        Current semester has no end date set
                      </Text>
                    )}
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {useNumberOfAssignments && (
              <FormControl>
                <FormLabel color={labelColor}>Number of Assignments</FormLabel>
                <NumberInput
                  value={numberOfAssignments}
                  min={1}
                  max={50}
                  isReadOnly
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
                <Text fontSize="sm" color={labelColor} mt={2}>
                  Will end on {format(new Date(endDate), 'MMM d, yyyy')}
                </Text>
              </FormControl>
            )}

            <FormControl>
              <FormLabel color={labelColor}>Recurrence Pattern</FormLabel>
              <RadioGroup
                value={recurrenceType}
                onChange={(value: 'weekly' | 'biweekly' | 'monthly') => setRecurrenceType(value)}
                color={textColor}
              >
                <Stack>
                  <Radio value="weekly" colorScheme="blue">Every Week</Radio>
                  <Radio value="biweekly" colorScheme="blue">Every Other Week</Radio>
                  <Radio value="monthly" colorScheme="blue">Every Month</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            <FormControl>
              <HStack spacing={2} align="center">
                <FormLabel color={labelColor} mb={0}>Repeat Every</FormLabel>
                <Tooltip
                  label={getTooltipContent()}
                  placement="top"
                  hasArrow
                  whiteSpace="pre-line"
                >
                  <Icon as={InfoIcon} color={textColor} w={4} h={4} cursor="help" />
                </Tooltip>
              </HStack>
              <NumberInput
                value={recurrenceCount}
                onChange={(_, value) => {
                  setRecurrenceCount(value);
                  if (useNumberOfAssignments) {
                    suggestEndDate();
                  }
                }}
                min={1}
                max={12}
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
              <FormHelperText color={labelColor}>
                {recurrenceType === 'weekly' && 'Weeks'}
                {recurrenceType === 'biweekly' && 'Bi-weeks'}
                {recurrenceType === 'monthly' && 'Months'}
              </FormHelperText>
            </FormControl>

            <Box pt={2}>
              <Text fontWeight="medium" color={textColor}>Summary</Text>
              {useNumberOfAssignments ? (
                <Text fontSize="sm" color={labelColor}>
                  Will create {numberOfAssignments} assignments, ending on {format(new Date(endDate), 'MMM d, yyyy')}
                </Text>
              ) : (
                semesterEndDate && (
                  <>
                    <Text fontSize="sm" color={labelColor}>
                      Will create assignments until {format(new Date(semesterEndDate), 'MMM d, yyyy')}
                    </Text>
                    <Text fontSize="sm" color={labelColor}>
                      Total number of assignments: {calculatedAssignments}
                    </Text>
                  </>
                )
              )}
            </Box>

            {useNumberOfAssignments && hasMismatch && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text>
                    The current settings will create {calculatedAssignments} assignments instead of the requested {numberOfAssignments}.
                  </Text>
                  <Button size="sm" onClick={suggestEndDate}>
                    Adjust End Date
                  </Button>
                </VStack>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} isDisabled={useNumberOfAssignments && hasMismatch}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
