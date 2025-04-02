'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Button,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tag,
  Flex,
  Checkbox,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, EditIcon } from '@chakra-ui/icons';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  getDay,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { EditAssignmentModal } from './EditAssignmentModal';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const {
    assignments,
    classes,
    assignmentTypes,
    filterOptions,
    toggleAssignmentCompletion,
    getSemesterEvents,
  } = useStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weeks = eachWeekOfInterval(
    { start: calendarStart, end: calendarEnd },
    { weekStartsOn: 0 }
  );

  // Filter assignments based on selected classes and types
  const filteredAssignments = assignments
    .filter(a => {
      // Filter by completion status
      if (!filterOptions.showCompleted && a.completed) return false;

      // Filter by semester
      if (filterOptions.selectedSemester && a.semester !== filterOptions.selectedSemester) return false;

      // Filter by selected classes (if any are selected)
      if (filterOptions.selectedClasses.length > 0 && !filterOptions.selectedClasses.includes(a.classId)) return false;

      // Filter by selected types (if any are selected)
      if (filterOptions.selectedTypes.length > 0 && !filterOptions.selectedTypes.includes(a.type.id)) return false;

      return true;
    });

  // Get semester events
  const semesterEvents = getSemesterEvents();

  // Group assignments and events by date for the calendar
  const getEventsForDay = (date: Date) => {
    const assignments = filteredAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.dueDate), date)
    );

    const events = semesterEvents.filter((event) =>
      isSameDay(event.date, date)
    );

    return { assignments, events };
  };

  const dayBg = useColorModeValue('white', 'gray.700');
  const todayBg = useColorModeValue('blue.50', 'blue.900');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const mutedTextColor = useColorModeValue('gray.600', 'whiteAlpha.700');
  const semesterStartBg = useColorModeValue('green.100', 'green.900');
  const semesterEndBg = useColorModeValue('red.100', 'red.900');

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEditClick = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <VStack spacing={4} width="100%">
        <HStack justify="space-between" width="100%" p={4}>
          <Button
            leftIcon={<ChevronLeftIcon />}
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            Previous
          </Button>
          <Text fontSize="xl" fontWeight="bold" color={textColor}>
            {format(currentDate, 'MMMM yyyy')}
          </Text>
          <Button
            rightIcon={<ChevronRightIcon />}
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            Next
          </Button>
        </HStack>

        <Grid templateColumns="repeat(7, 1fr)" width="100%" gap={2}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Box key={day} textAlign="center" py={2}>
              <Text fontWeight="medium" color={mutedTextColor}>
                {day}
              </Text>
            </Box>
          ))}

          {weeks.map((week) =>
            eachDayOfInterval({ start: week, end: endOfWeek(week) }).map((date) => {
              const { assignments: dayAssignments, events: dayEvents } = getEventsForDay(date);
              const isCurrentMonth = isSameMonth(date, currentDate);

              return (
                <Box
                  key={date.toISOString()}
                  bg={isToday(date) ? todayBg : dayBg}
                  p={2}
                  borderWidth="1px"
                  borderColor={borderColor}
                  minH="100px"
                  cursor="pointer"
                  onClick={() => handleDateClick(date)}
                  _hover={{ borderColor: 'blue.500' }}
                >
                  <Text
                    textAlign="right"
                    color={isCurrentMonth ? textColor : mutedTextColor}
                    fontSize="sm"
                    mb={2}
                  >
                    {format(date, 'd')}
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    {/* Show semester events first */}
                    {dayEvents.map((event) => (
                      <Box
                        key={event.id}
                        p={1}
                        borderRadius="sm"
                        bg={event.type === 'semesterStart' ? semesterStartBg : semesterEndBg}
                        color={textColor}
                        fontSize="xs"
                        fontWeight="medium"
                      >
                        {event.title}
                      </Box>
                    ))}
                    {/* Then show assignments */}
                    {dayAssignments.slice(0, 3).map((assignment) => {
                      const assignmentClass = classes.find(
                        (c) => c.id === assignment.classId
                      );
                      const assignmentType = assignmentTypes.find(
                        (t) => t.id === assignment.type.id
                      );

                      return (
                        <Box
                          key={assignment.id}
                          p={1}
                          borderRadius="sm"
                          bg={assignmentClass?.color || 'blue.500'}
                          color="white"
                          fontSize="xs"
                          textDecoration={
                            assignment.completed ? 'line-through' : 'none'
                          }
                          opacity={assignment.completed ? 0.7 : 1}
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                        >
                          {assignment.title}
                        </Box>
                      );
                    })}
                    {(dayAssignments.length > 3 || dayEvents.length > 0) && (
                      <Text fontSize="xs" color={mutedTextColor} textAlign="right">
                        +{dayAssignments.length + dayEvents.length - 3} more
                      </Text>
                    )}
                  </VStack>
                </Box>
              );
            })
          )}
        </Grid>
      </VStack>

      {/* Day View Modal */}
      <Modal isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} size="lg">
        <ModalOverlay />
        <ModalContent bg={dayBg}>
          <ModalHeader color={textColor}>
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
          </ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              {selectedDate && (
                <>
                  {/* Show semester events first */}
                  {getEventsForDay(selectedDate).events.map((event) => (
                    <Box
                      key={event.id}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                      borderColor={borderColor}
                      bg={event.type === 'semesterStart' ? semesterStartBg : semesterEndBg}
                    >
                      <Text fontSize="md" fontWeight="medium" color={textColor}>
                        {event.title}
                      </Text>
                    </Box>
                  ))}
                  {/* Then show assignments */}
                  {getEventsForDay(selectedDate).assignments.map((assignment) => {
                    const assignmentClass = classes.find(
                      (c) => c.id === assignment.classId
                    );
                    const assignmentType = assignmentTypes.find(
                      (t) => t.id === assignment.type.id
                    );

                    return (
                      <Box
                        key={assignment.id}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={borderColor}
                        borderLeft="4px solid"
                        borderLeftColor={assignmentClass?.color || 'blue.500'}
                      >
                        <Flex justify="space-between" align="center">
                          <Flex align="center" gap={3}>
                            <Checkbox
                              isChecked={assignment.completed}
                              onChange={() => toggleAssignmentCompletion(assignment.id)}
                              colorScheme={assignmentClass?.color?.replace(/\.500$/, '') || 'blue'}
                            />
                            <Box>
                              <Text
                                fontSize="md"
                                fontWeight="medium"
                                color={textColor}
                                textDecoration={
                                  assignment.completed ? 'line-through' : 'none'
                                }
                              >
                                {assignment.title}
                              </Text>
                              <Flex gap={2} mt={1}>
                                <Tag
                                  bg={assignmentClass?.color || 'blue.500'}
                                  color="white"
                                >
                                  {assignmentClass?.name}
                                </Tag>
                                <Tag
                                  bg={assignmentType?.color || 'gray.500'}
                                  color="white"
                                >
                                  {assignmentType?.name}
                                </Tag>
                              </Flex>
                              {assignment.description && (
                                <Text mt={2} color={mutedTextColor} fontSize="sm">
                                  {assignment.description}
                                </Text>
                              )}
                            </Box>
                          </Flex>
                          <IconButton
                            aria-label="Edit assignment"
                            icon={<EditIcon />}
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(assignment.id);
                            }}
                          />
                        </Flex>
                      </Box>
                    );
                  })}
                  {getEventsForDay(selectedDate).assignments.length === 0 && getEventsForDay(selectedDate).events.length === 0 && (
                    <Text color={mutedTextColor} textAlign="center">
                      No events or assignments on this date
                    </Text>
                  )}
                </>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAssignmentId(null);
        }}
        assignmentId={selectedAssignmentId}
      />
    </>
  );
}
