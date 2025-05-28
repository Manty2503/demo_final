"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from "@/actions/create";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import { Plus, Edit, Trash, Calendar, Flag, CheckCircle } from "lucide-react"; // Import icons
import { motion } from "framer-motion"; // For animations

// Define the Task type based on your schema
type Task = {
  id: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string | null;
  status: string | null;
  userId: string;
};

export default function TasksPage() {
  const { user } = useUser();
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Fetch tasks when the user is authenticated
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Fetch all tasks for the authenticated user
  const fetchTasks = async () => {
    const result = await getTasks();
    if (result.success && result.data) {
      setTasks(result.data);
    }
  };

  // Handle form submission for creating or updating a task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("User is not authenticated.");
      return;
    }

    const taskData = {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      status,
    };

    const result = editingTask
      ? await updateTask(editingTask.id, taskData)
      : await createTask(taskData);

    if (result.success) {
      alert(`Task ${editingTask ? "updated" : "created"} successfully!`);
      resetForm();
      fetchTasks();
    } else {
      alert("Error: " + result.message);
    }
  };

  // Reset the form fields
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("");
    setStatus("");
    setEditingTask(null);
  };

  // Handle editing a task
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setDueDate(task.dueDate ? task.dueDate.toISOString().split("T")[0] : "");
    setPriority(task.priority || "");
    setStatus(task.status || "");
  };

  // Handle deleting a task
  const handleDelete = async (taskId: number) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      const result = await deleteTask(taskId);
      if (result.success) {
        alert("Task deleted successfully!");
        fetchTasks();
      } else {
        alert("Error: " + result.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Dark/Light Mode Toggle */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary">Task Manager</h1>
          <ModeToggle />
        </div>

        {/* Task Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Plus className="w-6 h-6" />
                {editingTask ? "Edit Task" : "Create a Task"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      placeholder="Enter priority (e.g., High, Medium, Low)"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input
                      id="status"
                      placeholder="Enter status (e.g., To Do, In Progress, Done)"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4">
                  {editingTask ? "Update Task" : "Create Task"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task List */}
        <h2 className="text-3xl font-bold mb-6 text-primary">Your Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {task.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{task.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {task.dueDate ? task.dueDate.toLocaleDateString() : "No due date"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Flag className="w-4 h-4" />
                    <span>Priority: {task.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4" />
                    <span>Status: {task.status}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(task)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(task.id)}
                    className="flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}