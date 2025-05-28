"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

// Define the TaskData type for creating/updating tasks
type TaskData = {
  title: string;
  description: string;
  dueDate: Date | null;
  priority: string | null;
  status: string | null;
};

// Create Task
export async function createTask(taskData: TaskData) {
  try {
    const authData = await auth();

    if (!authData || !authData.userId) {
      return { success: false, message: "User is not authenticated." };
    }

    await db.insert(tasks).values({
      ...taskData,
      userId: authData.userId,
    });

    return { success: true, message: "Task created successfully." };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, message: "Failed to create task." };
  }
}

// Read Tasks
export async function getTasks() {
  try {
    const authData = await auth();

    if (!authData || !authData.userId) {
      return { success: false, message: "User is not authenticated.", data: null };
    }

    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, authData.userId));

    return { success: true, message: "Tasks fetched successfully.", data: userTasks };
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { success: false, message: "Failed to fetch tasks.", data: null };
  }
}

// Update Task
export async function updateTask(taskId: number, taskData: TaskData) {
  try {
    const authData = await auth();

    if (!authData || !authData.userId) {
      return { success: false, message: "User is not authenticated." };
    }

    await db
      .update(tasks)
      .set(taskData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, authData.userId)));

    return { success: true, message: "Task updated successfully." };
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, message: "Failed to update task." };
  }
}

// Delete Task
export async function deleteTask(taskId: number) {
  try {
    const authData = await auth();

    if (!authData || !authData.userId) {
      return { success: false, message: "User is not authenticated." };
    }

    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, authData.userId)));

    return { success: true, message: "Task deleted successfully." };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, message: "Failed to delete task." };
  }
}

