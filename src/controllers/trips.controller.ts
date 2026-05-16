import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Trip } from "../models/Trip.js";
import { User } from "../models/User.js";
import type { TripService, TripStatus } from "../models/Trip.js";
import { AppError } from "../middleware/error.middleware.js";

const services: TripService[] = ["flex", "scooter", "freight", "intercity"];

type PopulatedPerson = {
  _id: mongoose.Types.ObjectId;
  email: string;
  fullName?: string;
  phone?: string;
};

function readPopulatedPerson(value: unknown): PopulatedPerson | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (!("_id" in o) || !("email" in o)) return null;
  if (typeof o.email !== "string") return null;
  const id = String(o._id);
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const fullName = typeof o.fullName === "string" ? o.fullName : undefined;
  const phone = typeof o.phone === "string" ? o.phone : undefined;
  return {
    _id: new mongoose.Types.ObjectId(id),
    email: o.email,
    ...(fullName !== undefined ? { fullName } : {}),
    ...(phone !== undefined ? { phone } : {}),
  };
}

type TripLeanDoc = {
  _id: mongoose.Types.ObjectId;
  passenger: unknown;
  captain?: unknown;
  service: TripService;
  status: TripStatus;
  origin: string;
  destination: string;
  fareEgp: number;
  createdAt?: Date;
  updatedAt?: Date;
};

function serializeTrip(doc: {
  id: string;
  service: string;
  status: string;
  origin: string;
  destination: string;
  fareEgp: number;
  createdAt?: Date;
  updatedAt?: Date;
  passenger?: { id: string; email: string; fullName?: string; phone?: string };
  captain?: { id: string; email: string; fullName?: string; phone?: string } | null;
}) {
  return {
    id: doc.id,
    service: doc.service,
    status: doc.status,
    origin: doc.origin,
    destination: doc.destination,
    fareEgp: doc.fareEgp,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
    passenger: doc.passenger,
    captain: doc.captain ?? null,
  };
}

const populateSelect = "email fullName phone";

export async function listTrips(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const filter: Record<string, unknown> = {
    $or: [{ passenger: userId }, { captain: userId }],
  };
  const status = req.query.status as string | undefined;
  if (status && ["in_progress", "completed", "cancelled"].includes(status)) {
    filter.status = status;
  }

  const rows = (await Trip.find(filter)
    .sort({ createdAt: -1 })
    .populate("passenger", populateSelect)
    .populate("captain", populateSelect)
    .lean()
    .exec()) as TripLeanDoc[];

  const mapped = rows.map((t) => {
    const p = readPopulatedPerson(t.passenger);
    const c = readPopulatedPerson(t.captain);
    return serializeTrip({
      id: String(t._id),
      service: t.service,
      status: t.status,
      origin: t.origin,
      destination: t.destination,
      fareEgp: t.fareEgp,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      passenger: p
        ? {
            id: String(p._id),
            email: p.email,
            ...(p.fullName !== undefined ? { fullName: p.fullName } : {}),
            ...(p.phone !== undefined ? { phone: p.phone } : {}),
          }
        : undefined,
      captain: c
        ? {
            id: String(c._id),
            email: c.email,
            ...(c.fullName !== undefined ? { fullName: c.fullName } : {}),
            ...(c.phone !== undefined ? { phone: c.phone } : {}),
          }
        : null,
    });
  });

  res.json({ trips: mapped });
}

export async function createTrip(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { origin, destination, service, fareEgp, captainId } = req.body as {
    origin?: string;
    destination?: string;
    service?: string;
    fareEgp?: number;
    captainId?: string;
  };

  if (!origin?.trim() || !destination?.trim()) {
    throw new AppError("origin and destination are required", 400);
  }
  if (!service || !services.includes(service as TripService)) {
    throw new AppError(`service must be one of: ${services.join(", ")}`, 400);
  }

  const fare = fareEgp ?? 0;
  if (typeof fare !== "number" || Number.isNaN(fare) || fare < 0) {
    throw new AppError("fareEgp must be a non-negative number", 400);
  }

  let captain: mongoose.Types.ObjectId | undefined;
  if (captainId) {
    if (!mongoose.Types.ObjectId.isValid(captainId)) {
      throw new AppError("captainId is invalid", 400);
    }
    const cap = await User.findById(captainId);
    if (!cap || cap.role !== "captain" || cap.captainRegistrationStep !== "complete") {
      throw new AppError("captainId must reference a registered captain", 400);
    }
    captain = cap._id;
  }

  const trip = await Trip.create({
    passenger: userId,
    captain,
    service: service as TripService,
    origin: origin.trim(),
    destination: destination.trim(),
    fareEgp: fare,
  });

  const populated = (await Trip.findById(trip._id)
    .populate("passenger", populateSelect)
    .populate("captain", populateSelect)
    .lean()
    .exec()) as TripLeanDoc | null;

  if (!populated) {
    throw new AppError("Trip not found after create", 500);
  }

  const p = readPopulatedPerson(populated.passenger);
  const c = readPopulatedPerson(populated.captain);

  res.status(201).json({
    trip: serializeTrip({
      id: String(populated._id),
      service: populated.service,
      status: populated.status,
      origin: populated.origin,
      destination: populated.destination,
      fareEgp: populated.fareEgp,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      passenger: p
        ? {
            id: String(p._id),
            email: p.email,
            ...(p.fullName !== undefined ? { fullName: p.fullName } : {}),
            ...(p.phone !== undefined ? { phone: p.phone } : {}),
          }
        : undefined,
      captain: c
        ? {
            id: String(c._id),
            email: c.email,
            ...(c.fullName !== undefined ? { fullName: c.fullName } : {}),
            ...(c.phone !== undefined ? { phone: c.phone } : {}),
          }
        : null,
    }),
  });
}
