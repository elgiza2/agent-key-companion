import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { CalendarDays, Clock, MapPin, Star, Utensils, Building2, Compass } from "lucide-react";
import { SearchPhoto } from "./media";
import { children } from "./style";

export const PlaceCard = defineComponent({
  name: "PlaceCard",
  props: z.object({
    title: z.string(),
    image: z.string(),
    kind: z.enum(["hotel", "restaurant", "place"]).optional(),
    address: z.string().optional(),
    details: z.array(z.string()).optional(),
    price: z.string().optional(),
    rating: z.string().optional(),
    children: children.optional(),
  }),
  description:
    "Photo-led hotel, restaurant or attraction card. Only include researched prices, ratings and details. Children are native actions.",
  component: ({ props, renderNode }) => {
    const Kind =
      props.kind === "hotel" ? Building2 : props.kind === "restaurant" ? Utensils : Compass;
    return (
      <article className="iui-card iui-place-card">
        <SearchPhoto query={props.image} aspectRatio={1.7} radius={0} />
        <div className="iui-destination-body">
          <div className="iui-destination-heading">
            <span className="iui-destination-kind">
              <Kind size={14} />
              {props.kind ?? "place"}
            </span>
            {props.rating && (
              <span className="iui-destination-rating">
                <Star size={13} />
                {props.rating}
              </span>
            )}
          </div>
          <h3 className="iui-destination-title">{props.title}</h3>
          {props.address && (
            <p className="iui-destination-meta">
              <MapPin size={14} />
              <span>{props.address}</span>
            </p>
          )}
          {!!props.details?.length && (
            <ul className="iui-destination-tags">
              {props.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
          {props.price && <p className="iui-destination-price">{props.price}</p>}
          {props.children && (
            <div className="iui-destination-actions">{renderNode(props.children)}</div>
          )}
        </div>
      </article>
    );
  },
});

export const MenuItem = defineComponent({
  name: "MenuItem",
  props: z.object({
    name: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    price: z.string().optional(),
    tags: z.array(z.string()).optional(),
    children: children.optional(),
  }),
  description:
    "Restaurant dish with a searched photo, description, verified price and optional dietary tags and actions.",
  component: ({ props, renderNode }) => (
    <article className="iui-menu-item">
      <div className="iui-menu-content">
        <div className="iui-menu-heading">
          <h3 className="iui-destination-title">{props.name}</h3>
          {props.price && <strong className="iui-menu-price">{props.price}</strong>}
        </div>
        {props.description && <p className="iui-caption">{props.description}</p>}
        {!!props.tags?.length && (
          <ul className="iui-destination-tags">
            {props.tags.map((tag, i) => (
              <li key={i}>{tag}</li>
            ))}
          </ul>
        )}
        {props.children && (
          <div className="iui-destination-actions">{renderNode(props.children)}</div>
        )}
      </div>
      {props.image && (
        <div className="iui-menu-photo">
          <SearchPhoto query={props.image} aspectRatio={1} />
        </div>
      )}
    </article>
  ),
});

export const ScheduleItem = defineComponent({
  name: "ScheduleItem",
  props: z.object({
    title: z.string(),
    date: z.string(),
    time: z.string(),
    location: z.string().optional(),
    status: z.enum(["suggested", "confirmed", "unavailable"]).optional(),
    children: children.optional(),
  }),
  description:
    "Appointment, event or itinerary stop. Use suggested unless a real booking/calendar result confirms it. Include timezone in time.",
  component: ({ props, renderNode }) => (
    <article className="iui-schedule-item">
      <div className="iui-schedule-date">
        <CalendarDays size={18} />
        <span>{props.date}</span>
      </div>
      <div className="iui-schedule-content">
        <div className="iui-destination-heading">
          <h3 className="iui-destination-title">{props.title}</h3>
          <span className={`iui-schedule-status is-${props.status ?? "suggested"}`}>
            {props.status ?? "suggested"}
          </span>
        </div>
        <p className="iui-destination-meta">
          <Clock size={14} />
          <span>{props.time}</span>
        </p>
        {props.location && (
          <p className="iui-destination-meta">
            <MapPin size={14} />
            <span>{props.location}</span>
          </p>
        )}
        {props.children && (
          <div className="iui-destination-actions">{renderNode(props.children)}</div>
        )}
      </div>
    </article>
  ),
});
