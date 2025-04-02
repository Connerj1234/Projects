// EditTypeModal.tsx
'use client';

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
  useToast,
  VStack,
  IconButton,
  HStack,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { HexColorPicker } from 'react-colorful';
import { useState } from 'react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';

export function EditTypeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { assignmentTypes, addAssignmentType, updateAssignmentTypeColor, removeAssignmentType } = useStore();

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3182CE');
  const [selectedTypeForColor, setSelectedTypeForColor] = useState<string | null>(null);

  const toast = useToast();

  const handleAddType = () => {
    if (newTypeName.trim()) {
      const id = newTypeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      addAssignmentType({ id, name: newTypeName.trim(), color: newTypeColor });

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

  const handleDeleteType = (id: string) => {
    removeAssignmentType(id);
    toast({
      title: 'Type deleted',
      description: `Type removed successfully`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader color={textColor}>Manage Assignment Types</ModalHeader>
        <ModalCloseButton color={textColor} />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel color={textColor}>Add New Type</FormLabel>
              <InputGroup>
                <Input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Enter type name"
                  bg={bgColor}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                />
                <InputRightElement width="4.5rem">
                  <HStack spacing={1}>
                    <IconButton
                      aria-label="Pick type color"
                      icon={<Box w="3" h="3" borderRadius="full" bg={newTypeColor} border="1px solid" borderColor={borderColor} />}
                      onClick={() => setSelectedTypeForColor('new')}
                      size="sm"
                    />
                    <IconButton
                      icon={<AddIcon />}
                      aria-label="Add type"
                      onClick={handleAddType}
                      size="sm"
                      isDisabled={!newTypeName.trim()}
                    />
                  </HStack>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Box mt={6}>
              <Text fontWeight="medium" color={textColor} mb={2}>Existing Types</Text>
              <VStack spacing={3} align="stretch">
                {assignmentTypes.map((type) => (
                  <HStack key={type.id} justify="space-between">
                    <HStack>
                      <Box
                        w="4"
                        h="4"
                        borderRadius="full"
                        bg={type.color}
                        border="1px solid"
                        borderColor={borderColor}
                        cursor="pointer"
                        onClick={() => setSelectedTypeForColor(type.id)}
                      />
                      <Text color={textColor}>{type.name}</Text>
                    </HStack>
                    <IconButton
                      icon={<DeleteIcon />}
                      aria-label="Delete type"
                      onClick={() => handleDeleteType(type.id)}
                      size="sm"
                      variant="ghost"
                    />
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} color={textColor}>Close</Button>
        </ModalFooter>
      </ModalContent>

      {/* Color Picker Modal */}
      <Modal isOpen={!!selectedTypeForColor} onClose={() => setSelectedTypeForColor(null)}>
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Choose Type Color</ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <HexColorPicker
              color={selectedTypeForColor === 'new'
                ? newTypeColor
                : assignmentTypes.find((t) => t.id === selectedTypeForColor)?.color || '#3182CE'}
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
            <Button onClick={() => setSelectedTypeForColor(null)} color={textColor}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Modal>
  );
}
