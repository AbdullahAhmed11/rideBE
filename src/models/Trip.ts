import mongoose, { Schema, type Types } from "mongoose";

export type TripService = "flex" | "scooter" | "freight" | "intercity";
export type TripStatus = "in_progress" | "completed" | "cancelled";

export interface ITrip {
  passenger: Types.ObjectId;
  captain?: Types.ObjectId;
  service: TripService;
  status: TripStatus;
  origin: string;
  destination: string;
  fareEgp: number;
}

const tripSchema = new Schema<ITrip>(
  {
    passenger: { type: Schema.Types.ObjectId, ref: "User", required: true },
    captain: { type: Schema.Types.ObjectId, ref: "User" },
    service: {
      type: String,
      enum: ["flex", "scooter", "freight", "intercity"],
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "cancelled"],
      default: "in_progress",
    },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    fareEgp: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

tripSchema.index({ passenger: 1, createdAt: -1 });
tripSchema.index({ captain: 1, createdAt: -1 });

export const Trip = mongoose.model<ITrip>("Trip", tripSchema);
